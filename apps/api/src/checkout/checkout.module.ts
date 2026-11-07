import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module";
import { CheckoutController } from "./checkout.controller";
import { CheckoutService } from "./checkout.service";
import { SandboxPaymentAdapter } from "../payments/payment.adapter";

@Module({ imports: [CartModule], controllers: [CheckoutController], providers: [CheckoutService, SandboxPaymentAdapter], exports: [CheckoutService] })
export class CheckoutModule {}
