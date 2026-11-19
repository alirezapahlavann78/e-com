import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { CreateMediaAssetDto, UpdateMediaAssetDto, UploadMediaDto } from "./dto/media.dto";

/** Root folder for locally uploaded files (served at /uploads by main.ts). */
const UPLOAD_ROOT = resolve(process.cwd(), "uploads");
const MAX_BYTES = 8 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
};

const slug = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "file";

@ApiTags("admin-media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/media")
export class MediaController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get() @RequirePermissions("media:read")
  list(@Query("folder") folder?: string, @Query("q") q?: string, @Query("take") take?: string) {
    const search = q?.trim();
    return this.prisma.mediaAsset.findMany({
      where: {
        ...(folder ? { folder } : {}),
        ...(search
          ? {
              OR: [
                { key: { contains: search, mode: "insensitive" as const } },
                { alt: { contains: search, mode: "insensitive" as const } },
                { folder: { contains: search, mode: "insensitive" as const } },
                { tags: { has: search } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(take ?? 200), 500),
    });
  }

  @Get("folders") @RequirePermissions("media:read")
  async folders() {
    const rows = await this.prisma.mediaAsset.findMany({ select: { folder: true }, distinct: ["folder"] });
    return rows.map((row) => row.folder).filter((folder): folder is string => Boolean(folder)).sort();
  }

  /**
   * Stores an image sent as a base64 data payload on local disk and records it in
   * the media library. Keeps the panel usable without S3/MinIO: swapping this for
   * the S3 adapter later only changes this method.
   */
  @Post("upload") @RequirePermissions("media:write")
  async upload(@Body() dto: UploadMediaDto, @CurrentUser() user: AuthUser) {
    const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dto.dataUrl) ?? null;
    const base64 = (match ? match[2] : dto.dataUrl.replace(/^data:[^,]*,/, "")) ?? "";
    const mimeType = dto.mimeType ?? match?.[1] ?? "application/octet-stream";
    if (!EXT_BY_MIME[mimeType] && !mimeType.startsWith("image/")) {
      throw new BadRequestException("Only images, PDF and MP4 files can be uploaded");
    }

    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length) throw new BadRequestException("Empty file");
    if (buffer.length > MAX_BYTES) throw new BadRequestException("File is larger than 8 MB");

    const folder = slug(dto.folder ?? "uploads");
    const original = slug(dto.filename ?? `${Date.now()}`);
    const ext = EXT_BY_MIME[mimeType] ?? (extname(original) || ".bin");
    const base = original.endsWith(ext) ? original.slice(0, -ext.length) : original;
    const key = `${folder}/${Date.now()}-${base}-${randomUUID().slice(0, 6)}${ext}`;

    const absolute = join(UPLOAD_ROOT, ...key.split("/"));
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, buffer);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        key,
        bucket: "local",
        url: `/uploads/${key}`,
        mimeType,
        size: buffer.length,
        alt: dto.alt ?? null,
        folder,
        tags: dto.tags ?? [],
        uploadedBy: user.id,
      },
    });
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "media.upload", entity: "MediaAsset", entityId: asset.id, after: asset });
    return asset;
  }

  @Post("assets") @RequirePermissions("media:write")
  async create(@Body() dto: CreateMediaAssetDto, @CurrentUser() user: AuthUser) {
    const asset = await this.prisma.mediaAsset.create({ data: { ...dto, uploadedBy: user.id, tags: dto.tags ?? [] } });
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "media.create", entity: "MediaAsset", entityId: asset.id, after: asset });
    return asset;
  }

  @Patch(":id") @RequirePermissions("media:write")
  async update(@Param("id") id: string, @Body() dto: UpdateMediaAssetDto, @CurrentUser() user: AuthUser) {
    const before = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Media asset not found");
    const asset = await this.prisma.mediaAsset.update({ where: { id }, data: { alt: dto.alt, folder: dto.folder, tags: dto.tags } });
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "media.update", entity: "MediaAsset", entityId: id, before, after: asset });
    return asset;
  }

  @Delete(":id") @RequirePermissions("media:write")
  async remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Media asset not found");
    await this.prisma.mediaAsset.delete({ where: { id } });
    // only files this controller wrote are deleted from disk
    if (asset.url.startsWith("/uploads/")) {
      const absolute = resolve(UPLOAD_ROOT, asset.url.replace(/^\/uploads\//, ""));
      if (relative(UPLOAD_ROOT, absolute).split(sep)[0] !== "..") await unlink(absolute).catch(() => undefined);
    }
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "media.delete", entity: "MediaAsset", entityId: id, before: asset });
    return { ok: true };
  }

  @Get(":id/file") @RequirePermissions("media:read")
  async file(@Param("id") id: string, @Res() res: Response) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Media asset not found");
    res.redirect(asset.url);
  }
}
