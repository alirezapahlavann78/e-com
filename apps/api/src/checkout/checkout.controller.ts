import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, type AuthUser } from "../common/decorators/current-user.decorator";
import { CheckoutService } from "./checkout.service";

@ApiTags("checkout")
@Controller("checkout")
export class CheckoutController {
  constructor(private checkout: CheckoutService) {}
  @Public() @Post()
  create(@Body() body: { guestToken?: string; email: string; shippingAddress: Record<string, unknown>; discountCode?: string }, @CurrentUser() user: AuthUser | undefined) { return this.checkout.createOrder({ userId: user?.id, ...body }); }
  @Public() @Get("sandbox/verify")
  verify(@Query("reference") reference: string) { return this.checkout.verifySandbox(reference); }
}
