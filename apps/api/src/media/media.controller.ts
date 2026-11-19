import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { unlink } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { CreateMediaAssetDto, UpdateMediaAssetDto, UploadMediaDto } from "./dto/media.dto";
import { UPLOAD_ROOT, saveDataUrl, slugifyFile } from "../common/local-upload";

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
    const stored = await saveDataUrl(dto.dataUrl, {
      folder: dto.folder ?? "uploads",
      mimeType: dto.mimeType,
      filename: dto.filename,
    });
    const key = stored.key;
    const folder = key.split("/")[0]!;
    const mimeType = stored.mimeType;

    const asset = await this.prisma.mediaAsset.create({
      data: {
        key,
        bucket: "local",
        url: `/uploads/${key}`,
        mimeType,
        size: stored.size,
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
