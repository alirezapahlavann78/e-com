import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}
  list(userId: string) { return this.prisma.wishlistItem.findMany({ where: { userId }, include: { product: { select: { id: true, name: true, slug: true, basePrice: true, status: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } } }, orderBy: { createdAt: "desc" } }); }
  async add(userId: string, productId: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!p) throw new NotFoundException("Product not found");
    await this.prisma.wishlistItem.upsert({ where: { userId_productId: { userId, productId } }, update: {}, create: { userId, productId } });
    await this.prisma.customerActivity.create({ data: { userId, type: "WISHLIST_ADDED", entity: "Product", entityId: productId, summary: "Product added to wishlist" } }).catch(() => null);
    return this.list(userId);
  }
  async remove(userId: string, productId: string) { await this.prisma.wishlistItem.deleteMany({ where: { userId, productId } }); return this.list(userId); }
}
