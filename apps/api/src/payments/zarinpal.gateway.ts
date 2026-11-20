import {
  PaymentGatewayError,
  toProviderAmount,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentGateway,
  type VerifyPaymentInput,
  type VerifyPaymentResult,
} from "./payment-gateway";

interface ZarinpalConfig {
  merchantId: string;
  sandbox: boolean;
}

interface ZarinpalEnvelope {
  data?: {
    code?: number;
    message?: string;
    authority?: string;
    ref_id?: number;
    card_pan?: string;
  };
  errors?: { code?: number; message?: string } | unknown[];
}

/**
 * Real Zarinpal driver (REST v4).
 *
 * Request:  POST https://payment.zarinpal.com/pg/v4/payment/request.json
 * Start:    https://payment.zarinpal.com/pg/StartPay/<authority>
 * Verify:   POST https://payment.zarinpal.com/pg/v4/payment/verify.json
 *
 * With `sandbox: true` the same calls go to sandbox.zarinpal.com, which accepts
 * any merchant id starting with `zzz`/`Zzz` and lets the whole flow be tested
 * without a real merchant contract.
 */
export class ZarinpalGateway implements PaymentGateway {
  readonly provider = "ZARINPAL" as const;

  constructor(private readonly config: ZarinpalConfig) {}

  private get host() {
    return this.config.sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
  }

  private async post<T extends ZarinpalEnvelope>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.host}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await response.text();
    let parsed: ZarinpalEnvelope;
    try {
      parsed = JSON.parse(text) as ZarinpalEnvelope;
    } catch {
      throw new PaymentGatewayError(`Zarinpal returned non-JSON (${response.status})`, response.status, { text });
    }
    if (!response.ok) {
      throw new PaymentGatewayError(`Zarinpal HTTP ${response.status}`, response.status, parsed as Record<string, unknown>);
    }
    return parsed as T;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!this.config.merchantId) {
      throw new PaymentGatewayError("Zarinpal merchant id is not configured (ZARINPAL_MERCHANT_ID)", "NO_MERCHANT");
    }
    const amount = toProviderAmount(input.amount, input.currency);
    const envelope = await this.post("/pg/v4/payment/request.json", {
      merchant_id: this.config.merchantId,
      amount,
      callback_url: input.callbackUrl,
      description: input.description,
      metadata: {
        ...(input.email ? { email: input.email } : {}),
        ...(input.mobile ? { mobile: input.mobile } : {}),
        order_number: input.orderNumber,
      },
    });
    const code = envelope.data?.code;
    const authority = envelope.data?.authority;
    if (code !== 100 || !authority) {
      throw new PaymentGatewayError(
        `Zarinpal rejected the payment request (code ${code ?? "n/a"})`,
        code,
        envelope as unknown as Record<string, unknown>,
      );
    }
    return {
      authority,
      redirectUrl: `${this.host}/pg/StartPay/${authority}`,
      raw: { ...envelope, amount, sandbox: this.config.sandbox },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const amount = toProviderAmount(input.amount, input.currency);
    const envelope = await this.post("/pg/v4/payment/verify.json", {
      merchant_id: this.config.merchantId,
      amount,
      authority: input.authority,
    });
    const code = envelope.data?.code;
    // 100 = verified now, 101 = already verified for this authority (idempotent replay).
    if (code === 100 || code === 101) {
      return {
        status: "PAID",
        refId: envelope.data?.ref_id ? String(envelope.data.ref_id) : undefined,
        raw: envelope as unknown as Record<string, unknown>,
      };
    }
    return {
      status: "FAILED",
      message: envelope.data?.message ?? (envelope.errors as { message?: string } | undefined)?.message ?? `code ${code}`,
      raw: envelope as unknown as Record<string, unknown>,
    };
  }
}
