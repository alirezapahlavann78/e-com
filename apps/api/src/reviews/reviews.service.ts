import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { saveDataUrl } from "../common/local-upload";
import { CreateReviewDto, ModerateReviewDto } from "./dto/reviews.dto";

const REVIEW_PHOTO_MAX_BYTES = 4 * 1024 * 1024;
const PHOTO_PREFIXES = ["/uploads/", "/media/"];
const UPLOAD_WINDOW_MS = 10 * 60_000;
const UPLOAD_LIMIT = 20;

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  /** In-memory quota so the public upload route cannot be used as free file hosting. */
  private uploads = new Map<string, { count: number; resetAt: number }>();

  private assertUploadQuota(ip?: string) {
    const key = ip || "anonymous";
    const now = Date.now();
    const entry = this.uploads.get(key);
    if (!entry || entry.resetAt < now) {
      this.uploads.set(key, { count: 1, resetAt: now + UPLOAD_WINDOW_MS });
      return;
    }
    if (entry.count >= UPLOAD_LIMIT) throw new BadRequestException("Too many photo uploads, please try again later");
    entry.count += 1;
  }

  async uploadPhoto(dto: { dataUrl: string; mimeType?: string; filename?: string }, ip?: string) {
    this.assertUploadQuota(ip);
    const stored = await saveDataUrl(dto.dataUrl, {
      folder: "reviews",
      mimeType: dto.mimeType,
      filename: dto.filename,
      maxBytes: REVIEW_PHOTO_MAX_BYTES,
    });
    if (!stored.mimeType.startsWith("image/")) throw new BadRequestException("Only images can be attached to a review");
    return { url: stored.url, size: stored.size };
  }

  async listPublicByProduct(productSlug: string) {
    const product = await this.prisma.product.findFirst({ where: { slug: productSlug, status: "PUBLISHED" }, select: { id: true } });
    if (!product) throw new NotFoundException("Product not found");
    const [items, agg] = await this.prisma.$transaction([
      this.prisma.productReview.findMany({
        where: { productId: product.id, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, rating: true, title: true, body: true, authorName: true, isVerified: true, createdAt: true,
          images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, alt: true } },
        },
      }),
      this.prisma.productReview.aggregate({ where: { productId: product.id, status: "APPROVED" }, _avg: { rating: true }, _count: true }),
    ]);
    const photos = items.reduce((sum, item) => sum + item.images.length, 0);
    return { items, summary: { count: agg._count, averageRating: agg._avg.rating ?? 0, photoCount: photos } };
  }

  async submit(productSlug: string, dto: CreateReviewDto, user?: AuthUser) {
    const product = await this.prisma.product.findFirst({ where: { slug: productSlug, status: "PUBLISHED" }, select: { id: true } });
    if (!product) throw new NotFoundException("Product not found");

    const images = (dto.images ?? []).map((url) => url.trim()).filter(Boolean).slice(0, 3);
    for (const url of images) {
      const allowed = PHOTO_PREFIXES.some((prefix) => url.startsWith(prefix)) || /^https?:\/\//i.test(url);
      if (!allowed) throw new BadRequestException("Invalid review photo URL");
    }

    const review = await this.prisma.productReview.create({
      data: {
        productId: product.id,
        userId: user?.id,
        authorName: dto.authorName ?? user?.email ?? "Customer",
        rating: dto.rating,
        title: dto.title?.trim() || null,
        body: dto.body,
        status: "PENDING",
        isVerified: !!user?.id,
        images: images.length ? { create: images.map((url, index) => ({ url, sortOrder: index })) } : undefined,
      },
      include: { images: true },
    });
    if (user?.id) {
      await this.prisma.customerActivity
        .create({ data: { userId: user.id, type: "REVIEW_SUBMITTED", entity: "ProductReview", entityId: review.id, summary: images.length ? `Product review submitted with ${images.length} photo(s)` : "Product review submitted" } })
        .catch(() => null);
    }
    return review;
  }

  listAdmin(query: { status?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 30)));
    const where = query.status ? { status: query.status as any } : {};
    return this.prisma.$transaction(async (tx) => ({
      items: await tx.productReview.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, email: true } },
          images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      total: await tx.productReview.count({ where }),
      page,
      limit,
    }));
  }

  async moderate(id: string, dto: ModerateReviewDto, actor: AuthUser) {
    const before = await this.prisma.productReview.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Review not found");
    const item = await this.prisma.productReview.update({ where: { id }, data: { status: (dto.status as any) ?? before.status, moderatedBy: actor.id, moderatedAt: new Date() } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "review.moderate", entity: "ProductReview", entityId: id, before, after: item });
    return item;
  }
}
