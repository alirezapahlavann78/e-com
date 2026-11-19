import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { StatsService } from "./stats.service";

@ApiTags("admin/stats")
@ApiBearerAuth()
@Controller("admin/stats")
export class StatsController {
  constructor(private stats: StatsService) {}

  @Get() @RequirePermissions("orders:read") dashboard() { return this.stats.dashboard(); }
}
