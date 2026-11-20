import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import type { PaymentGateway, PaymentProviderName } from "./payment-gateway";
import { SandboxGateway } from "./sandbox.gateway";
import { ZarinpalGateway } from "./zarinpal.gateway";

export interface PaymentRuntimeConfig {
  provider: PaymentProviderName;
  zarinpal: { merchantId: string; sandbox: boolean };
  storefrontUrl: string;
  apiPublicUrl: string;
  /** Human readable reasons why the selected driver cannot run right now. */
  warnings: string[];
}

/**
 * Resolves which gateway to use.
 *
 * Priority: store setting `payment.gateway` (editable from the admin panel) →
 * environment (`PAYMENT_PROVIDER`) → sandbox. Nothing here is hardcoded to a
 * fake success: if Zarinpal is selected without a merchant id the API returns a
 * clear 400 instead of pretending the payment worked.
 */
@Injectable()
export class PaymentGatewayFactory {
  constructor(private readonly prisma: PrismaService) {}

  async config(): Promise<PaymentRuntimeConfig> {
    const [setting, legacy] = await Promise.all([
      this.prisma.storeSetting.findUnique({ where: { key: "payment.gateway" } }).catch(() => null),
      this.prisma.storeSetting.findUnique({ where: { key: "payments.provider" } }).catch(() => null),
    ]);
    const value = (setting?.value ?? {}) as {
      provider?: string;
      zarinpal?: { merchantId?: string; sandbox?: boolean };
    };
    const legacyProvider = typeof (legacy?.value as { value?: string } | null)?.value === "string"
      ? ((legacy?.value as { value: string }).value)
      : undefined;
    const envProvider = (process.env.PAYMENT_PROVIDER ?? "").toUpperCase();
    const requested = (value.provider ?? legacyProvider ?? envProvider ?? "SANDBOX").toUpperCase();
    const provider: PaymentProviderName = requested === "ZARINPAL" ? "ZARINPAL" : "SANDBOX";
    const merchantId = value.zarinpal?.merchantId ?? process.env.ZARINPAL_MERCHANT_ID ?? "";
    const sandboxFromEnv = (process.env.ZARINPAL_SANDBOX ?? "true").toLowerCase() !== "false";
    const zarinpalSandbox = value.zarinpal?.sandbox ?? sandboxFromEnv;
    const warnings: string[] = [];
    if (provider === "ZARINPAL" && !merchantId) warnings.push("ZARINPAL_MERCHANT_ID is empty");
    if (provider === "ZARINPAL" && !zarinpalSandbox && merchantId.length < 36) {
      warnings.push("merchant id looks too short for the production host");
    }
    return {
      provider,
      zarinpal: { merchantId, sandbox: zarinpalSandbox },
      storefrontUrl: (process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000").replace(/\/$/, ""),
      apiPublicUrl: (process.env.API_PUBLIC_URL ?? "http://localhost:4000/api").replace(/\/$/, ""),
      warnings,
    };
  }

  async gateway(): Promise<{ gateway: PaymentGateway; config: PaymentRuntimeConfig }> {
    const config = await this.config();
    if (config.provider === "ZARINPAL") {
      return { gateway: new ZarinpalGateway(config.zarinpal), config };
    }
    return { gateway: new SandboxGateway(config.storefrontUrl), config };
  }

  async callbackUrl(provider: PaymentProviderName): Promise<string> {
    const config = await this.config();
    return `${config.apiPublicUrl}/payments/callback/${provider.toLowerCase()}`;
  }
}
