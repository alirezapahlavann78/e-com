import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private include = {
    categories: { include: { category: true } },
    images: { orderBy: { sortOrder: "asc" as const } },
    seo: true,
    variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" as const }, include: { attributes: { include: { attributeValue: { include: { attribute: true } } } } } },
    relationsFrom: { include: { toProduct: { select: { id: true, name: true, slug: true, basePrice: true, status: true, images: { take: 1, orderBy: { sortOrder: "asc" as const } } } } }, orderBy: { sortOrder: "asc" as const } },
  };

  async listAdmin(page = 1, limit = 20, status?: string) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const where = status ? { status: status as any } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: this.include }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit: take };
  }

  async getAdmin(id: string) {
    const item = await this.prisma.product.findUnique({ where: { id }, include: this.include });
    if (!item) throw new NotFoundException("Product not found");
    return item;
  }

  async create(dto: CreateProductDto, actor: AuthUser) {
    const item = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: dto.name, slug: dto.slug, description: dto.description, shortDescription: dto.shortDescription,
          type: dto.type, status: dto.status, sku: dto.sku, barcode: dto.barcode,
          basePrice: dto.basePrice, compareAtPrice: dto.compareAtPrice, stockQuantity: dto.stockQuantity ?? 0,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          publishedAt: dto.status === "PUBLISHED" ? new Date() : undefined,
          categories: dto.categoryIds?.length ? { create: dto.categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
          images: dto.images?.length ? { create: dto.images } : undefined,
          seo: dto.seo ? { create: dto.seo } : undefined,
        },
      });
      if (dto.variants?.length) await this.replaceVariants(tx, product.id, dto.variants);
      if (dto.relations?.length) await tx.productRelation.createMany({ data: dto.relations.map((r, i) => ({ fromProductId: product.id, toProductId: r.toProductId, type: r.type ?? "RELATED", sortOrder: i })) });
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: this.include });
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "product.create", entity: "Product", entityId: item.id, after: item });
    return item;
  }

  async update(id: string, dto: UpdateProductDto, actor: AuthUser) {
    const before = await this.getAdmin(id);
    const item = await this.prisma.$transaction(async (tx) => {
      if (dto.categoryIds) await tx.productCategory.deleteMany({ where: { productId: id } });
      if (dto.images) await tx.productImage.deleteMany({ where: { productId: id } });
      if (dto.variants) await tx.productVariant.deleteMany({ where: { productId: id } });
      if (dto.relations) await tx.productRelation.deleteMany({ where: { fromProductId: id } });
      await tx.product.update({
        where: { id },
        data: {
          name: dto.name, slug: dto.slug, description: dto.description, shortDescription: dto.shortDescription,
          type: dto.type, status: dto.status, sku: dto.sku, barcode: dto.barcode,
          basePrice: dto.basePrice, compareAtPrice: dto.compareAtPrice, stockQuantity: dto.stockQuantity,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : dto.scheduledAt === null ? null : undefined,
          publishedAt: dto.status === "PUBLISHED" && !before.publishedAt ? new Date() : undefined,
          categories: dto.categoryIds ? { create: dto.categoryIds.map((categoryId) => ({ categoryId })) } : undefined,
          images: dto.images ? { create: dto.images } : undefined,
          seo: dto.seo ? { upsert: { create: dto.seo, update: dto.seo } } : undefined,
        },
      });
      if (dto.variants?.length) await this.replaceVariants(tx, id, dto.variants);
      if (dto.relations?.length) await tx.productRelation.createMany({ data: dto.relations.map((r, i) => ({ fromProductId: id, toProductId: r.toProductId, type: r.type ?? "RELATED", sortOrder: i })) });
      return tx.product.findUniqueOrThrow({ where: { id }, include: this.include });
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "product.update", entity: "Product", entityId: id, before, after: item });
    return item;
  }

  private async replaceVariants(tx: any, productId: string, variants: NonNullable<CreateProductDto["variants"]>) {
    for (const [i, v] of variants.entries()) {
      await tx.productVariant.create({
        data: {
          productId, sku: v.sku, barcode: v.barcode, title: v.title, price: v.price, compareAtPrice: v.compareAtPrice,
          stockQuantity: v.stockQuantity ?? 0, isActive: v.isActive ?? true, sortOrder: i, imageUrl: v.imageUrl,
          attributes: v.attributeValueIds?.length ? { create: v.attributeValueIds.map((attributeValueId) => ({ attributeValueId })) } : undefined,
        },
      });
    }
  }

  async remove(id: string, actor: AuthUser) {
    const before = await this.getAdmin(id);
    await this.prisma.product.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "product.delete", entity: "Product", entityId: id, before });
    return { ok: true };
  }

  async listPublic(page = 1, limit = 20, q?: string, categorySlug?: string, sort?: string, minPrice?: number, maxPrice?: number, inStock?: boolean) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const orderBy = sort === "price_asc" ? { basePrice: "asc" as const } : sort === "price_desc" ? { basePrice: "desc" as const } : sort === "newest" ? { createdAt: "desc" as const } : { publishedAt: "desc" as const };
    const where = {
      status: "PUBLISHED" as const,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }, { shortDescription: { contains: q, mode: "insensitive" as const } }] } : {}),
      ...(categorySlug ? { categories: { some: { category: { slug: categorySlug, isActive: true } } } } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined ? { basePrice: { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) } } : {}),
      ...(inStock ? { OR: [{ stockQuantity: { gt: 0 } }, { variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip, take, orderBy, include: this.include }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit: take };
  }

  async autocomplete(q: string, limit = 8) {
    const take = Math.min(Math.max(limit, 1), 20);
    if (!q?.trim()) return { products: [], categories: [] };
    const [products, categories] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where: { status: "PUBLISHED", name: { contains: q, mode: "insensitive" } }, take, orderBy: { publishedAt: "desc" }, select: { id: true, name: true, slug: true, basePrice: true, images: { take: 1, orderBy: { sortOrder: "asc" } } } }),
      this.prisma.category.findMany({ where: { isActive: true, name: { contains: q, mode: "insensitive" } }, take, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
    ]);
    return { products, categories };
  }

  async getPublicBySlug(slug: string) {
    const item = await this.prisma.product.findFirst({ where: { slug, status: "PUBLISHED" }, include: this.include });
    if (!item) throw new NotFoundException("Product not found");
    return item;
  }
}
