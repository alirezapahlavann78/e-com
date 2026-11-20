import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { Public } from "../common/decorators/public.decorator";
import { RateLimit } from "../common/decorators/rate-limit.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import type { PaymentProviderName } from "./payment-gateway";
import { PaymentsService } from "./payments.service";
import { CompleteSandboxPaymentDto, PaymentQueryDto } from "./dto/payments.dto";

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @RateLimit(15, 60_000)
  @Post("orders/:orderId/initiate")
  initiate(@Param("orderId") orderId: string) {
    return this.payments.initiate(orderId, { reattempt: true });
  }

  @Public()
  @RateLimit(10, 60_000)
  @Post("orders/:number/retry")
  retry(@Param("number") number: string) {
    return this.payments.initiateByNumber(number);
  }

  @Public()
  @Get("status/:number")
  status(@Param("number") number: string) {
    return this.payments.publicStatus(number);
  }

  @Public()
  @Get("sandbox/session")
  sandboxSession(@Query("authority") authority?: string) {
    if (!authority) throw new BadRequestException("authority is required");
    return this.payments.sandboxSession(authority);
  }

  @Public()
  @RateLimit(20, 60_000)
  @Post("sandbox/complete")
  completeSandbox(@Body() dto: CompleteSandboxPaymentDto) {
    return this.payments.completeSandbox(dto.authority, dto.outcome);
  }

  /**
   * Provider bounce-back (Zarinpal sends the browser here with ?Authority&Status).
   * The response is a 302 to the storefront so a failure never strands the
   * customer on a raw JSON page.
   */
  @Public()
  @Get("callback/:provider")
  async callback(
    @Param("provider") provider: string,
    @Query("authority") authority: string | undefined,
    @Query("Authority") authorityUpper: string | undefined,
    @Query("status") status: string | undefined,
    @Query("Status") statusUpper: string | undefined,
    @Res() res: Response,
  ) {
    const normalized = provider.toUpperCase();
    if (!["ZARINPAL", "SANDBOX"].includes(normalized)) throw new BadRequestException("Unknown provider");
    const result = await this.payments.handleCallback(normalized as PaymentProviderName, {
      authority: authority ?? authorityUpper,
      status: status ?? statusUpper,
    });
    return res.redirect(302, result.redirectUrl);
  }
}

@ApiTags("admin-payments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("admin/payments")
export class AdminPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @RequirePermissions("orders:read")
  list(@Query() query: PaymentQueryDto) {
    return this.payments.listAdmin(query);
  }

  @Get("config")
  @RequirePermissions("settings:read")
  config() {
    return this.payments.adminConfig();
  }
}
