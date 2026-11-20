import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { NotificationService } from "./notifications.service";
import { NotificationsWorker } from "./notifications.worker";
import { NotificationQueryDto, TestNotificationDto } from "./dto/notifications.dto";

@ApiTags("admin-notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationService, private readonly worker: NotificationsWorker) {}

  @Get()
  @RequirePermissions("crm:read")
  list(@Query() query: NotificationQueryDto) {
    return this.notifications.list(query);
  }

  @Get("transports")
  @RequirePermissions("crm:read")
  transports() {
    return this.notifications.transportsInfo();
  }

  @Post("test")
  @RequirePermissions("crm:write")
  test(@Body() dto: TestNotificationDto) {
    return this.notifications.sendTest(dto.channel, dto.to);
  }

  @Post("dispatch")
  @RequirePermissions("crm:write")
  dispatch() {
    return this.worker.tick().then(() => this.notifications.list({ limit: "1" }));
  }

  @Post(":id/retry")
  @RequirePermissions("crm:write")
  retry(@Param("id") id: string) {
    return this.notifications.retry(id);
  }

  @Post(":id/cancel")
  @RequirePermissions("crm:write")
  cancel(@Param("id") id: string) {
    return this.notifications.cancel(id);
  }
}
