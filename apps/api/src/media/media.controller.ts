import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { AuditService } from "../audit/audit.service";
import { CreateMediaAssetDto } from "./dto/media.dto";

@ApiTags("admin-media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/media")
export class MediaController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get() @RequirePermissions("media:read")
  list(@Query("folder") folder?: string) { return this.prisma.mediaAsset.findMany({ where: folder ? { folder } : undefined, orderBy: { createdAt: "desc" }, take: 100 }); }

  @Post("assets") @RequirePermissions("media:write")
  async create(@Body() dto: CreateMediaAssetDto, @CurrentUser() user: AuthUser) {
    const asset = await this.prisma.mediaAsset.create({ data: { ...dto, uploadedBy: user.id, tags: dto.tags ?? [] } });
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "media.create", entity: "MediaAsset", entityId: asset.id, after: asset });
    return asset;
  }

  @Post("upload-intent") @RequirePermissions("media:write")
  intent(@Body() body: { filename: string; mimeType: string; folder?: string }) {
    const safe = body.filename.replace(/[^a-zA-Z0-9._-]/g, "-");
    const key = `${body.folder ?? "uploads"}/${Date.now()}-${randomUUID()}-${safe}`;
    return { key, bucket: process.env.S3_BUCKET ?? "ecom-aghaci", publicUrlBase: process.env.S3_PUBLIC_URL ?? "http://localhost:9000/ecom-aghaci", uploadMode: "signed-url-adapter-required", note: "Sprint 4 stores asset records and returns intent; wire S3 presign in storage adapter when dependencies/runtime are verified." };
  }
}
