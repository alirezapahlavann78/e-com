import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { RateLimit } from "../common/decorators/rate-limit.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { CheckoutService } from "./checkout.service";

@ApiTags("checkout")
@Controller("checkout")
export class CheckoutController {
  constructor(private checkout: CheckoutService) {}
  @Public() @RateLimit(12, 60_000) @Post()
  create(
    @Body()
    body: {
      guestToken?: string;
      email: string;
      shippingAddress: Record<string, unknown>;
      discountCode?: string;
      shippingMethod?: "standard" | "express";
      customerNote?: string;
    },
    @CurrentUser() user: AuthUser | undefined,
  ) {
    return this.checkout.createOrder({ userId: user?.id, ...body });
  }
}
