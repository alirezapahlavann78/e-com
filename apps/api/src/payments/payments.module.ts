import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { PaymentGatewayFactory } from "./payment-gateway.factory";
import { PaymentsService } from "./payments.service";
import { AdminPaymentsController, PaymentsController } from "./payments.controller";

@Module({
  imports: [NotificationsModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [PaymentGatewayFactory, PaymentsService],
  exports: [PaymentsService, PaymentGatewayFactory],
})
export class PaymentsModule {}
