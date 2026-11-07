import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module";
import { DiscountsModule } from "../discounts/discounts.module";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { SandboxPaymentAdapter } from "../payments/payment.adapter";

@Module({ imports: [CartModule, DiscountsModule], controllers: [CheckoutController], providers: [CheckoutService, SandboxPaymentAdapter] })
export class CheckoutModule {}
