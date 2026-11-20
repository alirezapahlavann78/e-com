import { Module } from "@nestjs/common";

import { NotificationsController } from "./notifications.controller";
import { NotificationService } from "./notifications.service";
import { NotificationsWorker } from "./notifications.worker";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationService, NotificationsWorker],
  exports: [NotificationService],
})
export class NotificationsModule {}
