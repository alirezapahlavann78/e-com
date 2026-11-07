import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CartService } from "../cart/cart.service";
import { SandboxPaymentAdapter } from "../payments/payment.adapter";

function orderNumber() { return `AG-${Date.now().toString(36).toUpperCase()}`; }

@Injectable()
export class CheckoutService {
  constructor(private prisma: PrismaService, private cartService: CartService, private payment: SandboxPaymentAdapter) {}

  async createOrder(input: { userId?: string; guestToken?: string; email: string; shippingAddress: Record<string, unknown>; discountCode?: string }) {
    const cart = await this.cartService.getOrCreate(input);
    if (!cart.items.length) throw new BadRequestException("Cart is empty");
    const order = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.cart.findUnique({ where: { id: cart.id }, include: { items: { include: { product: true, variant: true } } } });
      if (!fresh?.items.length) throw new BadRequestException("Cart is empty");
      for (const item of fresh.items) {
        const available = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
        if (item.product.trackInventory && available < item.quantity) throw new BadRequestException(`Insufficient stock for ${item.product.name}`);
      }
      const subtotal = fresh.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
      const total = subtotal; // discount/shipping/tax adapters can extend here
      const created = await tx.order.create({
        data: {
          number: orderNumber(), userId: input.userId, cartId: fresh.id, email: input.email, status: "AWAITING_PAYMENT", paymentStatus: "PENDING",
          currency: fresh.currency, subtotal, discountAmount: 0, shippingAmount: 0, taxAmount: 0, total, shippingAddress: input.shippingAddress as any, placedAt: new Date(),
          items: { create: fresh.items.map((i) => ({ productId: i.productId, variantId: i.variantId, name: i.product.name, sku: i.variant?.sku ?? i.product.sku, variantTitle: i.variant?.title, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: Number(i.unitPrice) * i.quantity, imageUrl: i.variant?.imageUrl ?? null })) },
          statusHistory: { create: { toStatus: "AWAITING_PAYMENT", toPayment: "PENDING", note: "Order created from checkout" } },
        },
        include: { items: true },
      });
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
      return created;
    });
    const intent = await this.payment.createIntent({ orderId: order.id, amount: Number(order.total), currency: order.currency });
    const payment = await this.prisma.payment.create({ data: { orderId: order.id, provider: "SANDBOX", status: "PENDING", amount: order.total, currency: order.currency, reference: intent.reference, authority: intent.authority, rawResponse: intent.raw as any } });
    return { order, payment: { ...payment, redirectUrl: intent.redirectUrl } };
  }

  async verifySandbox(reference: string) {
    const payment = await this.prisma.payment.findFirst({ where: { reference }, include: { order: true } });
    if (!payment) throw new NotFoundException("Payment not found");
    const result = await this.payment.verify({ reference, authority: payment.authority ?? undefined });
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({ where: { id: payment.orderId } });
      await tx.payment.update({ where: { id: payment.id }, data: { status: result.status, rawResponse: result.raw as any, paidAt: result.status === "PAID" ? new Date() : null } });
      const order = await tx.order.update({ where: { id: payment.orderId }, data: { status: result.status === "PAID" ? "PAID" : "CANCELLED", paymentStatus: result.status } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: before?.status, toStatus: order.status, fromPayment: before?.paymentStatus, toPayment: order.paymentStatus, note: `Sandbox payment ${result.status}` } });
      if (result.status !== "PAID") {
        const items = await tx.orderItem.findMany({ where: { orderId: payment.orderId } });
        const warehouse = await tx.warehouse.findFirst({ where: { isDefault: true, isActive: true } }) ?? await tx.warehouse.findFirst({ where: { isActive: true } });
        for (const item of items) {
          if (item.variantId) await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stockQuantity: { increment: item.quantity } } });
          else if (item.productId) await tx.product.updateMany({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
          if (warehouse && item.productId) {
            const inv = await tx.inventoryItem.findFirst({ where: { warehouseId: warehouse.id, productId: item.productId, variantId: item.variantId ?? null } });
            if (inv) await tx.inventoryItem.update({ where: { id: inv.id }, data: { quantity: { increment: item.quantity } } });
            await tx.stockMovement.create({ data: { warehouseId: warehouse.id, productId: item.productId, variantId: item.variantId ?? null, orderId: payment.orderId, type: "RELEASE", quantity: item.quantity, reference, note: "Payment failed/cancelled release" } });
          }
        }
        await tx.stockReservation.updateMany({ where: { orderId: payment.orderId }, data: { status: "RELEASED" } });
      }
    });
    return this.prisma.order.findUnique({ where: { id: payment.orderId }, include: { items: true, payments: true } });
  }
}
