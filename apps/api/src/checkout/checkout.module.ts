import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module";
import { DiscountsModule } from "../discounts/discounts.module";
import { PaymentsModule } from "../payments/payments.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";

@Module({
  imports: [CartModule, DiscountsModule, PaymentsModule, NotificationsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
