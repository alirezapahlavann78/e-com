import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

export interface PaymentIntentResult { provider: "SANDBOX"; reference: string; authority: string; redirectUrl: string; raw: Record<string, unknown>; }
export interface PaymentAdapter { createIntent(input: { orderId: string; amount: number; currency: string }): Promise<PaymentIntentResult>; verify(input: { reference: string; authority?: string }): Promise<{ status: "PAID" | "FAILED"; raw: Record<string, unknown> }>; }

@Injectable()
export class SandboxPaymentAdapter implements PaymentAdapter {
  async createIntent(input: { orderId: string; amount: number; currency: string }): Promise<PaymentIntentResult> {
    const reference = `sandbox_${randomUUID()}`;
    const authority = `auth_${randomUUID().slice(0, 8)}`;
    return { provider: "SANDBOX", reference, authority, redirectUrl: `/checkout/sandbox?reference=${encodeURIComponent(reference)}&orderId=${encodeURIComponent(input.orderId)}`, raw: { ...input, mode: "sandbox" } };
  }
  async verify(input: { reference: string; authority?: string }): Promise<{ status: "PAID" | "FAILED"; raw: Record<string, unknown> }> { return { status: "PAID", raw: { ...input, verifiedAt: new Date().toISOString(), mode: "sandbox" } }; }
}
