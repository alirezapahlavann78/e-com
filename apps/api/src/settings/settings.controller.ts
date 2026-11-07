import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { UpsertSettingDto } from "./settings.dto";
import { AuditService } from "../audit/audit.service";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";

@ApiTags("admin-settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/settings")
export class SettingsController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get()
  @RequirePermissions("settings:read")
  async list() {
    return this.prisma.storeSetting.findMany({ orderBy: { key: "asc" } });
  }

  @Put()
  @RequirePermissions("settings:write")
  async upsert(@Body() dto: UpsertSettingDto, @CurrentUser() user: AuthUser) {
    const before = await this.prisma.storeSetting.findUnique({ where: { key: dto.key } });
    const setting = await this.prisma.storeSetting.upsert({
      where: { key: dto.key },
      update: { value: dto.value as object },
      create: { key: dto.key, value: dto.value as object },
    });
    await this.audit.log({
      actorId: user.id,
      actorEmail: user.email,
      action: "settings.upsert",
      entity: "StoreSetting",
      entityId: setting.id,
      before,
      after: setting,
    });
    return setting;
  }
}
