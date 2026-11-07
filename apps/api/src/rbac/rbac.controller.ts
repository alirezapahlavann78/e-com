import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { CreateRoleDto } from "./dto/create-role.dto";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";

@ApiTags("admin-rbac")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/rbac")
export class RbacController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  @Get("roles")
  @RequirePermissions("rbac:read")
  roles() {
    return this.prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } });
  }

  @Get("permissions")
  @RequirePermissions("rbac:read")
  permissions() {
    return this.prisma.permission.findMany({ orderBy: { key: "asc" } });
  }

  @Post("roles")
  @RequirePermissions("rbac:manage")
  async createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: AuthUser) {
    const role = await this.prisma.role.create({ data: { name: dto.name, description: dto.description } });
    if (dto.permissionKeys?.length) await this.setPermissions(role.id, dto.permissionKeys);
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "rbac.role.create", entity: "Role", entityId: role.id, after: dto });
    return this.prisma.role.findUnique({ where: { id: role.id }, include: { permissions: { include: { permission: true } } } });
  }

  @Put("roles/:id/permissions")
  @RequirePermissions("rbac:manage")
  async assign(@Param("id") id: string, @Body() dto: AssignPermissionsDto, @CurrentUser() user: AuthUser) {
    await this.setPermissions(id, dto.permissionKeys);
    await this.audit.log({ actorId: user.id, actorEmail: user.email, action: "rbac.role.permissions", entity: "Role", entityId: id, after: dto });
    return this.prisma.role.findUnique({ where: { id }, include: { permissions: { include: { permission: true } } } });
  }

  private async setPermissions(roleId: string, keys: string[]) {
    const perms = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({ data: perms.map((p) => ({ roleId, permissionId: p.id })) }),
    ]);
  }
}
