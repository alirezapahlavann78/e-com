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
      if (dto.slug && dto.slug !== before.slug) await tx.redirect.upsert({ where: { fromPath: `/products/${before.slug}` }, update: { toPath: `/products/${dto.slug}`, isActive: true, entityType: "Product", entityId: id }, create: { fromPath: `/products/${before.slug}`, toPath: `/products/${dto.slug}`, entityType: "Product", entityId: id } });
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

  private buildWhere(opts: {
    q?: string; categorySlug?: string; minPrice?: number; maxPrice?: number; inStock?: boolean;
    colors?: string[]; sizes?: string[]; brands?: string[];
  }) {
    const and: Record<string, unknown>[] = [];
    if (opts.q) and.push({ OR: [{ name: { contains: opts.q, mode: "insensitive" } }, { description: { contains: opts.q, mode: "insensitive" } }, { shortDescription: { contains: opts.q, mode: "insensitive" } }] });
    if (opts.categorySlug) and.push({ categories: { some: { category: { slug: opts.categorySlug, isActive: true } } } });
    if (opts.minPrice !== undefined || opts.maxPrice !== undefined) {
      and.push({ basePrice: { ...(opts.minPrice !== undefined ? { gte: opts.minPrice } : {}), ...(opts.maxPrice !== undefined ? { lte: opts.maxPrice } : {}) } });
    }
    if (opts.inStock) and.push({ OR: [{ stockQuantity: { gt: 0 } }, { variants: { some: { isActive: true, stockQuantity: { gt: 0 } } } }] });
    if (opts.brands?.length) and.push({ brand: { in: opts.brands } });
    const variantConds: Record<string, unknown>[] = [];
    if (opts.colors?.length) variantConds.push({ attributes: { some: { attributeValue: { slug: { in: opts.colors }, attribute: { slug: "color" } } } } });
    if (opts.sizes?.length) variantConds.push({ attributes: { some: { attributeValue: { slug: { in: opts.sizes }, attribute: { slug: "size" } } } } });
    if (variantConds.length) and.push({ variants: { some: { isActive: true, AND: variantConds } } });
    return { status: "PUBLISHED" as const, ...(and.length ? { AND: and } : {}) };
  }

  async listPublic(page = 1, limit = 20, q?: string, categorySlug?: string, sort?: string, minPrice?: number, maxPrice?: number, inStock?: boolean, colors?: string[], sizes?: string[], brands?: string[]) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const orderBy =
      sort === "price_asc"
        ? { basePrice: "asc" as const }
        : sort === "price_desc"
          ? { basePrice: "desc" as const }
          : sort === "newest"
            ? { createdAt: "desc" as const }
            : sort === "best"
              ? { orderItems: { _count: "desc" as const } }
              : sort === "name"
                ? { name: "asc" as const }
                : { publishedAt: "desc" as const };
    const where = this.buildWhere({ q, categorySlug, minPrice, maxPrice, inStock, colors, sizes, brands });
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip, take, orderBy, include: this.include }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit: take };
  }

  async facets(opts: { q?: string; categorySlug?: string; minPrice?: number; maxPrice?: number; inStock?: boolean; brands?: string[] }) {
    const where = this.buildWhere(opts);
    const rows = await this.prisma.product.findMany({
      where,
      select: {
        brand: true,
        basePrice: true,
        variants: {
          where: { isActive: true },
          select: { attributes: { select: { attributeValue: { select: { slug: true, value: true, sortOrder: true, meta: true, attribute: { select: { slug: true } } } } } } },
        },
      },
    });

    const colors = new Map<string, { slug: string; value: string; hex?: string; count: number; order: number }>();
    const sizes = new Map<string, { slug: string; value: string; count: number; order: number }>();
    const brands = new Map<string, number>();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    for (const row of rows) {
      const price = Number(row.basePrice ?? 0);
      if (price > 0) { min = Math.min(min, price); max = Math.max(max, price); }
      if (row.brand) brands.set(row.brand, (brands.get(row.brand) ?? 0) + 1);
      const seen = new Set<string>();
      for (const variant of row.variants) {
        for (const link of variant.attributes) {
          const av = link.attributeValue;
          if (!av || seen.has(av.slug)) continue;
          seen.add(av.slug);
          if (av.attribute.slug === "color") {
            const hex = (av.meta as { hex?: string } | null)?.hex;
            const current = colors.get(av.slug);
            colors.set(av.slug, { slug: av.slug, value: av.value, hex, order: av.sortOrder, count: (current?.count ?? 0) + 1 });
          } else if (av.attribute.slug === "size") {
            const current = sizes.get(av.slug);
            sizes.set(av.slug, { slug: av.slug, value: av.value, order: av.sortOrder, count: (current?.count ?? 0) + 1 });
          }
        }
      }
    }

    return {
      total: rows.length,
      colors: [...colors.values()].sort((a, b) => a.order - b.order).map(({ order: _order, ...rest }) => rest),
      sizes: [...sizes.values()].sort((a, b) => a.order - b.order).map(({ order: _order, ...rest }) => rest),
      brands: [...brands.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
      priceRange: { min: Number.isFinite(min) ? min : 0, max },
    };
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
    let item = await this.prisma.product.findFirst({ where: { slug, status: "PUBLISHED" }, include: this.include });
    if (!item) {
      const redirect = await this.prisma.redirect.findFirst({ where: { fromPath: `/products/${slug}`, isActive: true } });
      const target = redirect?.toPath.replace(/^\/products\//, "");
      if (target) item = await this.prisma.product.findFirst({ where: { slug: target, status: "PUBLISHED" }, include: this.include });
    }
    if (!item) throw new NotFoundException("Product not found");
    return item;
  }
}
