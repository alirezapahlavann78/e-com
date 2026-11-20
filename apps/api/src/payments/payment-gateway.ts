/**
 * Payment gateway contract.
 *
 * Every driver receives the order details, creates a provider-side payment and
 * returns an authority/token plus the URL the customer must be sent to. The
 * callback handler then calls `verify` with the same authority; only a
 * `PAID` answer from the provider is allowed to mark an order as paid.
 *
 * Two drivers ship with the repo:
 *  - `ZarinpalGateway`  real REST driver (production or Zarinpal sandbox host)
 *  - `SandboxGateway`   fully local driver for development: the customer has to
 *                       confirm on a hosted-in-repo page, so an order is never
 *                       marked paid just because a request was made.
 */
export type PaymentProviderName = "SANDBOX" | "ZARINPAL";

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  description: string;
  email?: string;
  mobile?: string;
  callbackUrl: string;
}

export interface CreatePaymentResult {
  authority: string;
  redirectUrl: string;
  raw: Record<string, unknown>;
}

export interface VerifyPaymentInput {
  authority: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentResult {
  status: "PAID" | "FAILED";
  refId?: string;
  message?: string;
  raw: Record<string, unknown>;
}

export interface PaymentGateway {
  readonly provider: PaymentProviderName;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}

export class PaymentGatewayError extends Error {
  constructor(
    message: string,
    readonly code?: string | number,
    readonly raw?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PaymentGatewayError";
  }
}

/** Zarinpal expects Rial; storefront prices are stored in Toman. */
export function toProviderAmount(amount: number, currency: string): number {
  const unit = (process.env.PAYMENT_AMOUNT_UNIT ?? "TOMAN").toUpperCase();
  const value = Math.round(Number(amount));
  if (currency.toUpperCase() === "IRR") return value;
  return unit === "RIAL" ? value : value * 10;
}
