import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateReviewDto, ModerateReviewDto } from "./dto/reviews.dto";

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async listPublicByProduct(productSlug: string) {
    const product = await this.prisma.product.findFirst({ where: { slug: productSlug, status: "PUBLISHED" }, select: { id: true } });
    if (!product) throw new NotFoundException("Product not found");
    const [items, agg] = await this.prisma.$transaction([
      this.prisma.productReview.findMany({ where: { productId: product.id, status: "APPROVED" }, orderBy: { createdAt: "desc" }, select: { id: true, rating: true, title: true, body: true, authorName: true, isVerified: true, createdAt: true } }),
      this.prisma.productReview.aggregate({ where: { productId: product.id, status: "APPROVED" }, _avg: { rating: true }, _count: true }),
    ]);
    return { items, summary: { count: agg._count, averageRating: agg._avg.rating ?? 0 } };
  }

  async submit(productSlug: string, dto: CreateReviewDto, user?: AuthUser) {
    const product = await this.prisma.product.findFirst({ where: { slug: productSlug, status: "PUBLISHED" }, select: { id: true } });
    if (!product) throw new NotFoundException("Product not found");
    const review = await this.prisma.productReview.create({ data: { productId: product.id, userId: user?.id, authorName: dto.authorName ?? (user?.email ?? "Customer"), rating: dto.rating, title: dto.title, body: dto.body, status: "PENDING", isVerified: !!user?.id } });
    if (user?.id) await this.prisma.customerActivity.create({ data: { userId: user.id, type: "REVIEW_SUBMITTED", entity: "ProductReview", entityId: review.id, summary: "Product review submitted" } }).catch(() => null);
    return review;
  }

  listAdmin(query: { status?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page ?? 1)); const limit = Math.min(100, Math.max(1, Number(query.limit ?? 30)));
    const where = query.status ? { status: query.status as any } : {};
    return this.prisma.$transaction(async (tx) => ({ items: await tx.productReview.findMany({ where, include: { product: { select: { id: true, name: true, slug: true } }, user: { select: { id: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }), total: await tx.productReview.count({ where }), page, limit }));
  }

  async moderate(id: string, dto: ModerateReviewDto, actor: AuthUser) {
    const before = await this.prisma.productReview.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Review not found");
    const item = await this.prisma.productReview.update({ where: { id }, data: { status: (dto.status as any) ?? before.status, moderatedBy: actor.id, moderatedAt: new Date() } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "review.moderate", entity: "ProductReview", entityId: id, before, after: item });
    return item;
  }
}
