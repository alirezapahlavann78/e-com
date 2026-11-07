import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  private include = { categories: { include: { category: true } }, images: { orderBy: { sortOrder: "asc" as const } }, seo: true };

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
    const item = await this.prisma.product.create({
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
      include: this.include,
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "product.create", entity: "Product", entityId: item.id, after: item });
    return item;
  }

  async update(id: string, dto: UpdateProductDto, actor: AuthUser) {
    const before = await this.getAdmin(id);
    const item = await this.prisma.$transaction(async (tx) => {
      if (dto.categoryIds) await tx.productCategory.deleteMany({ where: { productId: id } });
      if (dto.images) await tx.productImage.deleteMany({ where: { productId: id } });
      return tx.product.update({
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
        include: this.include,
      });
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "product.update", entity: "Product", entityId: id, before, after: item });
    return item;
  }

  async remove(id: string, actor: AuthUser) {
    const before = await this.getAdmin(id);
    await this.prisma.product.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "product.delete", entity: "Product", entityId: id, before });
    return { ok: true };
  }

  async listPublic(page = 1, limit = 20, q?: string, categorySlug?: string) {
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const where = {
      status: "PUBLISHED" as const,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { description: { contains: q, mode: "insensitive" as const } }] } : {}),
      ...(categorySlug ? { categories: { some: { category: { slug: categorySlug, isActive: true } } } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, skip, take, orderBy: { publishedAt: "desc" }, include: this.include }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit: take };
  }

  async getPublicBySlug(slug: string) {
    const item = await this.prisma.product.findFirst({ where: { slug, status: "PUBLISHED" }, include: this.include });
    if (!item) throw new NotFoundException("Product not found");
    return item;
  }
}
