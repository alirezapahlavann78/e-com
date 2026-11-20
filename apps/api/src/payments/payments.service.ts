import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { Order, Payment, Prisma } from "@ecom/db";

import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notifications.service";
import { PaymentGatewayFactory } from "./payment-gateway.factory";
import { PaymentGatewayError, type PaymentProviderName } from "./payment-gateway";

type FinalizeInput = {
  paymentId: string;
  status: "PAID" | "FAILED";
  refId?: string;
  message?: string;
  raw?: Record<string, unknown>;
  note: string;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly factory: PaymentGatewayFactory,
    private readonly notifications: NotificationService,
  ) {}

  /** Where the storefront should land after the provider finishes. */
  async resultUrl(orderNumber: string, outcome: "paid" | "failed", refId?: string) {
    const { config } = await this.factory.gateway();
    const params = new URLSearchParams({ order: orderNumber, payment: outcome });
    if (refId) params.set("ref", refId);
    return `${config.storefrontUrl}/checkout/result?${params.toString()}`;
  }

  async initiate(orderId: string, options: { reattempt?: boolean } = {}) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new NotFoundException("Order not found");
    if (order.paymentStatus === "PAID" || order.status === "PAID") {
      throw new BadRequestException("این سفارش قبلاً پرداخت شده است.");
    }
    if (!["PENDING", "AWAITING_PAYMENT"].includes(order.status)) {
      throw new BadRequestException("این سفارش در وضعیت قابل پرداخت نیست.");
    }
    if (order.paymentStatus === "FAILED" && !options.reattempt) {
      // A retry is allowed, but it has to be explicit so a stale page cannot
      // silently open a second payment for the same order.
      throw new BadRequestException("پرداخت این سفارش قبلاً ناموفق بوده است؛ برای تلاش دوباره، پرداخت مجدد را بزنید.");
    }

    const { gateway, config } = await this.factory.gateway();
    const callbackUrl = await this.factory.callbackUrl(gateway.provider);
    const mobile = this.mobileOf(order);
    let intent;
    try {
      intent = await gateway.createPayment({
        orderId: order.id,
        orderNumber: order.number,
        amount: Number(order.total),
        currency: order.currency,
        description: `سفارش ${order.number} — فروشگاه آگاهی`,
        email: order.email,
        mobile,
        callbackUrl,
      });
    } catch (error) {
      const message = error instanceof PaymentGatewayError ? error.message : (error as Error).message;
      this.logger.error(`gateway ${gateway.provider} rejected order ${order.number}: ${message}`);
      // Keep the attempt visible in the transaction trail so support can tell a
      // provider outage apart from a customer who never reached the gateway.
      await this.prisma.paymentEvent
        .create({
          data: {
            orderId: order.id,
            provider: gateway.provider,
            kind: "REQUEST_ERROR",
            status: "FAILED",
            amount: order.total,
            payload: { message } as Prisma.InputJsonValue,
          },
        })
        .catch(() => undefined);
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: "PAYMENT_GATEWAY_ERROR",
        provider: gateway.provider,
        message: "اتصال به درگاه پرداخت برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید.",
        detail: message,
      });
    }

    const existing = await this.prisma.payment.findFirst({
      where: { orderId: order.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    const payment = existing
      ? await this.prisma.payment.update({
          where: { id: existing.id },
          data: {
            provider: gateway.provider,
            authority: intent.authority,
            reference: `${gateway.provider.toLowerCase()}_${order.number}`,
            callbackUrl,
            rawResponse: intent.raw as Prisma.InputJsonValue,
          },
        })
      : await this.prisma.payment.create({
          data: {
            orderId: order.id,
            provider: gateway.provider,
            status: "PENDING",
            amount: order.total,
            currency: order.currency,
            authority: intent.authority,
            reference: `${gateway.provider.toLowerCase()}_${order.number}`,
            callbackUrl,
            rawResponse: intent.raw as Prisma.InputJsonValue,
          },
        });

    await this.prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        orderId: order.id,
        provider: gateway.provider,
        kind: "REQUEST",
        authority: intent.authority,
        status: "PENDING",
        amount: order.total,
        payload: { redirectUrl: intent.redirectUrl, sandbox: config.provider === "SANDBOX" } as Prisma.InputJsonValue,
      },
    });

    return { payment, order, redirectUrl: intent.redirectUrl, provider: config.provider, warnings: config.warnings };
  }

  async initiateByNumber(orderNumber: string) {
    const order = await this.prisma.order.findUnique({ where: { number: orderNumber } });
    if (!order) throw new NotFoundException("Order not found");
    return this.initiate(order.id, { reattempt: true });
  }

  /**
   * Provider callback. Always answers with a redirect to the storefront result
   * page: the customer is mid-browser-flow, so an HTML error page would be a
   * dead end.
   */
  async handleCallback(provider: PaymentProviderName, query: { authority?: string; status?: string; refId?: string }) {
    const authority = query.authority?.trim();
    if (!authority) return { redirectUrl: await this.resultUrl("", "failed") };

    const payment = await this.prisma.payment.findFirst({
      where: { authority, provider },
      include: { order: true },
      orderBy: { createdAt: "desc" },
    });
    if (!payment) {
      this.logger.warn(`Callback for unknown ${provider} authority ${authority}`);
      return { redirectUrl: await this.resultUrl("", "failed") };
    }
    const orderNumber = payment.order.number;

    if (payment.status === "PAID") {
      return { redirectUrl: await this.resultUrl(orderNumber, "paid", payment.refId ?? undefined) };
    }

    const providerStatus = (query.status ?? "").toUpperCase();
    if (provider === "ZARINPAL" && providerStatus !== "OK") {
      await this.finalize({
        paymentId: payment.id,
        status: "FAILED",
        message: `Zarinpal returned Status=${query.status ?? "unknown"}`,
        note: "درگاه: پرداخت توسط کاربر لغو شد",
      });
      return { redirectUrl: await this.resultUrl(orderNumber, "failed") };
    }

    const { gateway } = await this.factory.gateway();
    let verification;
    try {
      verification = await gateway.verifyPayment({
        authority,
        amount: Number(payment.amount),
        currency: payment.currency,
      });
    } catch (error) {
      this.logger.error(`Verify failed for ${authority}: ${(error as Error).message}`);
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          provider,
          kind: "VERIFY_ERROR",
          authority,
          status: "FAILED",
          payload: { error: (error as Error).message } as Prisma.InputJsonValue,
        },
      });
      return { redirectUrl: await this.resultUrl(orderNumber, "failed") };
    }

    const order = await this.finalize({
      paymentId: payment.id,
      status: verification.status,
      refId: verification.refId,
      message: verification.message,
      raw: verification.raw,
      note: verification.status === "PAID" ? `پرداخت ${provider} تأیید شد` : `پرداخت ${provider} ناموفق بود`,
    });
    return {
      redirectUrl: await this.resultUrl(
        orderNumber,
        verification.status === "PAID" ? "paid" : "failed",
        verification.refId,
      ),
    };
  }

  async sandboxSession(authority: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { authority, provider: "SANDBOX" },
      include: { order: { include: { items: { select: { quantity: true } } } } },
    });
    if (!payment) throw new NotFoundException("تراکنش یافت نشد");
    return {
      authority: payment.authority,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      orderNumber: payment.order.number,
      orderStatus: payment.order.status,
      itemsCount: payment.order.items.reduce((sum, item) => sum + item.quantity, 0),
      email: payment.order.email,
      merchant: "فروشگاه آگاهی — درگاه آزمایشی",
    };
  }

  async completeSandbox(authority: string, outcome: "success" | "cancel") {
    const payment = await this.prisma.payment.findFirst({
      where: { authority, provider: "SANDBOX" },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException("تراکنش یافت نشد");
    if (payment.status === "PAID") {
      return {
        status: "PAID",
        orderNumber: payment.order.number,
        redirectUrl: await this.resultUrl(payment.order.number, "paid", payment.refId ?? undefined),
      };
    }
    if (payment.status !== "PENDING") {
      return {
        status: payment.status,
        orderNumber: payment.order.number,
        redirectUrl: await this.resultUrl(payment.order.number, "failed"),
      };
    }

    if (outcome === "cancel") {
      await this.finalize({
        paymentId: payment.id,
        status: "FAILED",
        message: "Cancelled on sandbox page",
        note: "درگاه آزمایشی: پرداخت توسط کاربر لغو شد",
      });
      return {
        status: "FAILED",
        orderNumber: payment.order.number,
        redirectUrl: await this.resultUrl(payment.order.number, "failed"),
      };
    }

    const { gateway } = await this.factory.gateway();
    const verification = await gateway.verifyPayment({
      authority,
      amount: Number(payment.amount),
      currency: payment.currency,
    });
    await this.finalize({
      paymentId: payment.id,
      status: verification.status,
      refId: verification.refId,
      raw: verification.raw,
      note: "درگاه آزمایشی: پرداخت تأیید شد",
    });
    return {
      status: verification.status,
      orderNumber: payment.order.number,
      redirectUrl: await this.resultUrl(payment.order.number, verification.status === "PAID" ? "paid" : "failed", verification.refId),
    };
  }

  /** Public, minimal order state for the result page (works for guests too). */
  async publicStatus(orderNumber: string) {
    const order = await this.prisma.order.findUnique({
      where: { number: orderNumber },
      include: {
        items: { select: { name: true, quantity: true, totalPrice: true, imageUrl: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!order) throw new NotFoundException("سفارش یافت نشد");
    const payment = order.payments[0];
    return {
      number: order.number,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      currency: order.currency,
      email: order.email,
      placedAt: order.placedAt,
      items: order.items.map((item) => ({ ...item, totalPrice: Number(item.totalPrice) })),
      payment: payment
        ? {
            provider: payment.provider,
            status: payment.status,
            authority: payment.authority,
            refId: payment.refId,
            amount: Number(payment.amount),
            paidAt: payment.paidAt,
          }
        : null,
    };
  }

  async listAdmin(query: { status?: string; provider?: string; q?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where: Prisma.PaymentWhereInput = {};
    if (query.status) where.status = query.status as never;
    if (query.provider) where.provider = query.provider as never;
    if (query.q) {
      where.OR = [
        { order: { number: { contains: query.q, mode: "insensitive" } } },
        { order: { email: { contains: query.q, mode: "insensitive" } } },
        { refId: { contains: query.q } },
        { authority: { contains: query.q } },
      ];
    }
    const [items, total, summary] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { order: { select: { number: true, email: true, total: true, status: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.groupBy({ by: ["status"], _count: { _all: true }, _sum: { amount: true } }),
    ]);
    return {
      items: items.map((payment) => ({ ...payment, amount: Number(payment.amount) })),
      total,
      page,
      limit,
      summary: summary.map((row) => ({ status: row.status, count: row._count._all, amount: Number(row._sum.amount ?? 0) })),
    };
  }

  async adminConfig() {
    const { config } = await this.factory.gateway();
    return config;
  }

  /**
   * Single place where a payment becomes PAID/FAILED.
   *
   * Idempotent: replaying a callback for an already paid payment returns the
   * order untouched (no double stock release, no duplicate emails).
   */
  private async finalize(input: FinalizeInput): Promise<Order> {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { order: true } });
      if (!payment) throw new NotFoundException("Payment not found");
      if (payment.status === "PAID") return { order: payment.order, changed: false };
      if (payment.status === input.status) return { order: payment.order, changed: false };

      const before = payment.order;
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: input.status,
          refId: input.refId ?? payment.refId,
          rawResponse: (input.raw ?? {}) as Prisma.InputJsonValue,
          paidAt: input.status === "PAID" ? new Date() : null,
        },
      });

      const order = await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: input.status === "PAID" ? "PAID" : "CANCELLED",
          paymentStatus: input.status,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: before.status,
          toStatus: order.status,
          fromPayment: before.paymentStatus,
          toPayment: order.paymentStatus,
          note: input.message ? `${input.note} (${input.message})` : input.note,
        },
      });

      if (input.status !== "PAID") {
        if (before.discountCodeId) {
          await tx.discountCode.updateMany({
            where: { id: before.discountCodeId, usedCount: { gt: 0 } },
            data: { usedCount: { decrement: 1 } },
          });
        }
        const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
        const warehouse =
          (await tx.warehouse.findFirst({ where: { isDefault: true, isActive: true } })) ??
          (await tx.warehouse.findFirst({ where: { isActive: true } }));
        for (const item of items) {
          if (item.variantId) {
            await tx.productVariant.updateMany({
              where: { id: item.variantId },
              data: { stockQuantity: { increment: item.quantity } },
            });
          } else if (item.productId) {
            await tx.product.updateMany({
              where: { id: item.productId },
              data: { stockQuantity: { increment: item.quantity } },
            });
          }
          if (warehouse && item.productId) {
            const inventory = await tx.inventoryItem.findFirst({
              where: { warehouseId: warehouse.id, productId: item.productId, variantId: item.variantId ?? null },
            });
            if (inventory) {
              await tx.inventoryItem.update({
                where: { id: inventory.id },
                data: { quantity: { increment: item.quantity } },
              });
            }
            await tx.stockMovement.create({
              data: {
                warehouseId: warehouse.id,
                productId: item.productId,
                variantId: item.variantId ?? null,
                orderId: order.id,
                type: "RELEASE",
                quantity: item.quantity,
                reference: updatedPayment.reference ?? order.number,
                note: "Payment failed/cancelled release",
              },
            });
          }
        }
        await tx.stockReservation.updateMany({ where: { orderId: order.id }, data: { status: "RELEASED" } });
      }

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          orderId: order.id,
          provider: payment.provider,
          kind: "VERIFY",
          authority: payment.authority,
          status: input.status,
          amount: payment.amount,
          payload: (input.raw ?? {}) as Prisma.InputJsonValue,
          idempotencyKey: `${payment.provider}:${payment.id}:${input.status}`,
        },
      });

      return { order, changed: true, payment: updatedPayment };
    });

    if (result.changed && input.status === "PAID" && "payment" in result && result.payment) {
      // Notifications are best-effort: a mail provider hiccup must never roll
      // back a confirmed payment.
      await this.notifications
        .notifyPaymentPaid(result.order, result.payment as Payment)
        .catch((error: unknown) => this.logger.warn(`payment.paid notification failed: ${(error as Error).message}`));
    }
    return result.order;
  }

  private mobileOf(order: Order): string | undefined {
    const address = order.shippingAddress as { phone?: string } | null;
    return typeof address?.phone === "string" ? address.phone : undefined;
  }
}
