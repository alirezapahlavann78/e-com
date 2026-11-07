import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}
  private include = { items: { include: { product: { select: { id: true, name: true, slug: true, basePrice: true, images: { take: 1, orderBy: { sortOrder: "asc" as const } } } }, variant: { select: { id: true, title: true, sku: true, price: true, imageUrl: true } } }, orderBy: { createdAt: "asc" as const } } };

  async getOrCreate(input: { userId?: string; guestToken?: string }) {
    if (input.userId) {
      const found = await this.prisma.cart.findUnique({ where: { userId: input.userId }, include: this.include });
      if (found) return found;
      return this.prisma.cart.create({ data: { userId: input.userId }, include: this.include });
    }
    const token = input.guestToken || randomUUID();
    const found = token ? await this.prisma.cart.findUnique({ where: { guestToken: token }, include: this.include }).catch(() => null) : null;
    if (found) return found;
    return this.prisma.cart.create({ data: { guestToken: token }, include: this.include });
  }

  async addItem(input: { userId?: string; guestToken?: string; productId: string; variantId?: string; quantity: number }) {
    const cart = await this.getOrCreate(input);
    const product = await this.prisma.product.findUnique({ where: { id: input.productId }, include: { variants: true } });
    if (!product || product.status !== "PUBLISHED") throw new NotFoundException("Product not available");
    const variant = input.variantId ? product.variants.find((v) => v.id === input.variantId) : null;
    if (input.variantId && !variant) throw new NotFoundException("Variant not found");
    const unitPrice = Number(variant?.price ?? product.basePrice ?? 0);
    const existing = await this.prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: input.productId, variantId: input.variantId ?? null } });
    if (existing) await this.prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + input.quantity, unitPrice } });
    else await this.prisma.cartItem.create({ data: { cartId: cart.id, productId: input.productId, variantId: input.variantId, quantity: input.quantity, unitPrice } });
    return this.prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: this.include });
  }

  async updateItem(input: { userId?: string; guestToken?: string; itemId: string; quantity: number }) {
    const cart = await this.getOrCreate(input);
    const item = await this.prisma.cartItem.findFirst({ where: { id: input.itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException("Cart item not found");
    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } });
    return this.prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: this.include });
  }

  async removeItem(input: { userId?: string; guestToken?: string; itemId: string }) {
    const cart = await this.getOrCreate(input);
    await this.prisma.cartItem.deleteMany({ where: { id: input.itemId, cartId: cart.id } });
    return this.prisma.cart.findUniqueOrThrow({ where: { id: cart.id }, include: this.include });
  }

  summary(cart: any) {
    const subtotal = cart.items.reduce((s: number, i: any) => s + Number(i.unitPrice) * i.quantity, 0);
    return { ...cart, summary: { subtotal, discountAmount: 0, shippingAmount: 0, taxAmount: 0, total: subtotal } };
  }
}
