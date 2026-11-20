import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { PaymentsService } from "../payments/payments.service";
import { DiscountsService } from "../discounts/discounts.service";
import { NotificationService } from "../notifications/notifications.service";

function orderNumber() { return `AG-${Date.now().toString(36).toUpperCase()}`; }

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private payments: PaymentsService,
    private discounts: DiscountsService,
    private notifications: NotificationService,
  ) {}

  async createOrder(input: {
    userId?: string;
    guestToken?: string;
    email: string;
    shippingAddress: Record<string, unknown>;
    discountCode?: string;
    shippingMethod?: "standard" | "express";
    customerNote?: string;
  }) {
    const cart = await this.cartService.getOrCreate(input);
    if (!cart.items.length) throw new BadRequestException("Cart is empty");
    const order = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.cart.findUnique({ where: { id: cart.id }, include: { discountCode: true, items: { include: { product: true, variant: true } } } });
      if (!fresh?.items.length) throw new BadRequestException("Cart is empty");
      for (const item of fresh.items) {
        const available = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
        if (item.product.trackInventory && available < item.quantity) throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
      }
      const subtotal = fresh.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
      const code = input.discountCode ?? fresh.discountCode?.code;
      const discount = code ? await this.discounts.resolveActive(code, subtotal, input.userId) : null;
      const quote = await this.cartService.shippingQuote(subtotal, discount?.freeShipping ?? false);
      let shippingAmount = quote.amount;
      if (input.shippingMethod === "express" && shippingAmount > 0) {
        const expressSetting = await tx.storeSetting.findUnique({ where: { key: "shipping.expressRate" } });
        const expressRate = Number((expressSetting?.value as { value?: number } | number | null) ?? 149_000);
        shippingAmount = Number.isFinite(expressRate) ? expressRate : shippingAmount;
      }
      const discountAmount = discount?.discountAmount ?? 0;
      const total = Math.max(0, subtotal - discountAmount + shippingAmount);
      const created = await tx.order.create({
        data: {
          number: orderNumber(), userId: input.userId, cartId: fresh.id, email: input.email, status: "AWAITING_PAYMENT", paymentStatus: "PENDING",
          currency: fresh.currency, subtotal, discountAmount, shippingAmount, taxAmount: 0, total, discountCodeId: discount?.discountCode.id,
          shippingAddress: { ...input.shippingAddress, shippingMethod: input.shippingMethod ?? "standard" } as any,
          customerNote: input.customerNote, giftWrap: fresh.giftWrap, giftNote: fresh.giftNote, placedAt: new Date(),
          items: { create: fresh.items.map((i) => ({ productId: i.productId, variantId: i.variantId, name: i.product.name, sku: i.variant?.sku ?? i.product.sku, variantTitle: i.variant?.title, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: Number(i.unitPrice) * i.quantity, imageUrl: i.variant?.imageUrl ?? null })) },
          statusHistory: { create: { toStatus: "AWAITING_PAYMENT", toPayment: "PENDING", note: discount ? `Order created with discount ${discount.discountCode.code}` : "Order created from checkout" } },
          discountRedemptions: discount ? { create: { discountCodeId: discount.discountCode.id, userId: input.userId, amount: discountAmount } } : undefined,
        },
        include: { items: true, discountCode: true },
      });
      if (discount) await tx.discountCode.update({ where: { id: discount.discountCode.id }, data: { usedCount: { increment: 1 } } });
      for (const item of fresh.items) {
        if (!item.product.trackInventory) continue;
        if (item.variantId) await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQuantity: { decrement: item.quantity } } });
        else await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { decrement: item.quantity } } });
        const warehouse = await tx.warehouse.findFirst({ where: { isDefault: true, isActive: true } }) ?? await tx.warehouse.findFirst({ where: { isActive: true } });
        if (warehouse) {
          let inv = await tx.inventoryItem.findFirst({ where: { warehouseId: warehouse.id, productId: item.productId, variantId: item.variantId ?? null } });
          if (!inv) inv = await tx.inventoryItem.create({ data: { warehouseId: warehouse.id, productId: item.productId, variantId: item.variantId ?? null, quantity: Math.max(0, (item.variant ? item.variant.stockQuantity : item.product.stockQuantity) - item.quantity), lowStock: item.product.lowStockThreshold ?? 5 } });
          else await tx.inventoryItem.update({ where: { id: inv.id }, data: { quantity: { decrement: item.quantity } } });
          await tx.stockReservation.create({ data: { warehouseId: warehouse.id, productId: item.productId, variantId: item.variantId ?? null, orderId: created.id, cartId: fresh.id, quantity: item.quantity, status: "COMMITTED", expiresAt: new Date(Date.now() + 30 * 60_000) } });
          await tx.stockMovement.create({ data: { warehouseId: warehouse.id, productId: item.productId, variantId: item.variantId ?? null, orderId: created.id, type: "COMMIT", quantity: item.quantity, reference: created.number, note: "Checkout commit" } });
        }
      }
      await tx.cartItem.deleteMany({ where: { cartId: fresh.id } });
      await tx.cart.update({ where: { id: fresh.id }, data: { discountCodeId: null } });
      return created;
    });
    // The order exists from here on. If the gateway is down or misconfigured the
    // customer must still see the order number and be able to retry payment
    // (POST /payments/orders/:number/retry) — never a dead end.
    const start = await this.payments
      .initiate(order.id)
      .catch((error: Error) => {
        this.logger.warn(`payment initiation failed for ${order.number}: ${error.message}`);
        return null;
      });

    // Queued, not awaited on the critical path: checkout must not wait for SMTP.
    await this.notifications
      .notifyOrderPlaced(order)
      .catch((error: unknown) => this.logger.warn(`order.placed notification failed: ${(error as Error).message}`));

    return {
      order,
      payment: start ? { ...start.payment, redirectUrl: start.redirectUrl } : null,
      paymentError: start ? null : "درگاه پرداخت در دسترس نیست؛ می‌توانید بعداً پرداخت را تکمیل کنید.",
    };
  }
}
