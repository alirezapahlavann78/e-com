import { BadRequestException, Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("admin-reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/reports")
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get("sales") @RequirePermissions("orders:read")
  async sales(@Query("from") from?: string, @Query("to") to?: string) {
    try {
      return await this.reports.sales(from, to);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  @Get("export") @RequirePermissions("orders:read")
  async export(@Res({ passthrough: true }) res: Response, @Query("dataset") dataset = "orders", @Query("from") from?: string, @Query("to") to?: string) {
    try {
      const { filename, csv } = await this.reports.exportCsv(dataset, from, to);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return csv;
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }
}
