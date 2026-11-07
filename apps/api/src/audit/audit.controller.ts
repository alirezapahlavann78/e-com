import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";

@ApiTags("admin-audit")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/audit-logs")
export class AuditController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @RequirePermissions("audit:read")
  async list(@Query("page") page = "1", @Query("limit") limit = "20") {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip, take }),
      this.prisma.auditLog.count(),
    ]);
    return { items, total, page: Math.max(Number(page) || 1, 1), limit: take };
  }
}
