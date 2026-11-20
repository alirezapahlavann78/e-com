import { randomBytes } from "node:crypto";

import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentGateway,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "./payment-gateway";

/**
 * Local driver for development and demos.
 *
 * `createPayment` only allocates an authority and points the browser at
 * `/checkout/sandbox?authority=...`. Nothing is charged until the customer
 * presses "پرداخت" on that page, which calls
 * `POST /api/payments/sandbox/complete`. Only that endpoint reaches
 * `verifyPayment` (PaymentsService gates it by provider + PENDING status), so an
 * order never flips to PAID just because a request was made — same shape as a
 * real PSP: allocate → hosted confirm → verify.
 */
export class SandboxGateway implements PaymentGateway {
  readonly provider = "SANDBOX" as const;

  constructor(private readonly storefrontUrl: string) {}

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const authority = `SBX-${randomBytes(12).toString("hex").toUpperCase()}`;
    return {
      authority,
      redirectUrl: `${this.storefrontUrl}/checkout/sandbox?authority=${encodeURIComponent(authority)}`,
      raw: {
        mode: "sandbox",
        orderNumber: input.orderNumber,
        amount: input.amount,
        currency: input.currency,
        callbackUrl: input.callbackUrl,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    return {
      status: "PAID",
      refId: `SBX${Date.now().toString(36).toUpperCase()}`,
      raw: {
        mode: "sandbox",
        authority: input.authority,
        amount: input.amount,
        confirmedAt: new Date().toISOString(),
      },
    };
  }
}
