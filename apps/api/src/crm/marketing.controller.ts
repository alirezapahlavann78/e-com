import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Prisma } from "@ecom/db";
import { Permissions } from "../common/decorators/permissions.decorator";
import { CurrentUser, AuthUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

@ApiTags("marketing-admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("marketing")
export class MarketingController {
  constructor(private prisma: PrismaService, private audit: AuditService) {}
  @Permissions("crm:read") @Get("campaigns") campaigns() { return this.prisma.campaign.findMany({ include: { segment: true, _count: { select: { recipients: true, products: true, discountCodes: true } } }, orderBy: { createdAt: "desc" } }); }
  @Permissions("crm:read") @Get("campaigns/:id") campaign(@Param("id") id: string) { return this.prisma.campaign.findUnique({ where: { id }, include: { segment: true, products: { include: { product: { select: { id: true, name: true, slug: true } } } }, discountCodes: true, recipients: { take: 50, orderBy: { createdAt: "desc" } } } }); }
  @Permissions("crm:write") @Post("campaigns")
  async createCampaign(@Body() body: any, @CurrentUser() u: AuthUser) {
    const item = await this.prisma.campaign.create({ data: { name: body.name, slug: body.slug, description: body.description, status: body.status ?? "DRAFT", channel: body.channel ?? "EMAIL", startsAt: body.startsAt ? new Date(body.startsAt) : undefined, endsAt: body.endsAt ? new Date(body.endsAt) : undefined, segmentId: body.segmentId || undefined, metadata: body.metadata as Prisma.InputJsonValue } });
    await this.audit.log({ actorId: u.id, actorEmail: u.email, action: "campaign.create", entity: "Campaign", entityId: item.id, after: item });
    return item;
  }
  @Permissions("crm:write") @Patch("campaigns/:id")
  async updateCampaign(@Param("id") id: string, @Body() body: any, @CurrentUser() u: AuthUser) {
    const before = await this.prisma.campaign.findUnique({ where: { id } });
    const item = await this.prisma.campaign.update({ where: { id }, data: { name: body.name, slug: body.slug, description: body.description, status: body.status, channel: body.channel, startsAt: body.startsAt ? new Date(body.startsAt) : body.startsAt === null ? null : undefined, endsAt: body.endsAt ? new Date(body.endsAt) : body.endsAt === null ? null : undefined, segmentId: body.segmentId === "" ? null : body.segmentId, metadata: body.metadata as Prisma.InputJsonValue } });
    await this.audit.log({ actorId: u.id, actorEmail: u.email, action: "campaign.update", entity: "Campaign", entityId: id, before, after: item });
    return item;
  }

  @Permissions("crm:read") @Get("gift-cards") giftCards() { return this.prisma.giftCard.findMany({ orderBy: { createdAt: "desc" } }); }
  @Permissions("crm:write") @Post("gift-cards")
  async createGiftCard(@Body() body: any, @CurrentUser() u: AuthUser) {
    const code = String(body.code || "").trim().toUpperCase(); if (!code) throw new BadRequestException("code required");
    const value = Number(body.initialValue ?? body.balance ?? 0);
    const item = await this.prisma.giftCard.create({ data: { code, initialValue: value, balance: body.balance != null ? Number(body.balance) : value, currency: body.currency ?? "IRR", isActive: body.isActive ?? true, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined, metadata: body.metadata as Prisma.InputJsonValue } });
    await this.audit.log({ actorId: u.id, actorEmail: u.email, action: "giftcard.create", entity: "GiftCard", entityId: item.id, after: item });
    return item;
  }
  @Permissions("crm:write") @Patch("gift-cards/:id")
  async updateGiftCard(@Param("id") id: string, @Body() body: any, @CurrentUser() u: AuthUser) {
    const before = await this.prisma.giftCard.findUnique({ where: { id } });
    const item = await this.prisma.giftCard.update({ where: { id }, data: { isActive: body.isActive, expiresAt: body.expiresAt ? new Date(body.expiresAt) : body.expiresAt === null ? null : undefined, balance: body.balance != null ? Number(body.balance) : undefined, metadata: body.metadata as Prisma.InputJsonValue } });
    await this.audit.log({ actorId: u.id, actorEmail: u.email, action: "giftcard.update", entity: "GiftCard", entityId: id, before, after: item });
    return item;
  }

  @Permissions("crm:read") @Get("abandoned-carts") abandonedCarts(@Query("status") status?: string) {
    return this.prisma.abandonedCartSnapshot.findMany({ where: status ? { status } : undefined, include: { cart: { select: { id: true, userId: true, guestToken: true, updatedAt: true, items: { take: 5, include: { product: { select: { name: true, slug: true } } } } } } }, orderBy: { lastEventAt: "desc" }, take: 100 });
  }
  @Permissions("crm:write") @Post("abandoned-carts/snapshot/:cartId")
  async snapshotCart(@Param("cartId") cartId: string, @CurrentUser() u: AuthUser) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId }, include: { items: true, user: { select: { email: true } } } });
    if (!cart) throw new BadRequestException("Cart not found");
    const subtotal = cart.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
    const snap = await this.prisma.abandonedCartSnapshot.upsert({
      where: { cartId }, update: { itemCount: cart.items.length, subtotal, email: cart.user?.email, lastEventAt: new Date(), status: cart.items.length ? "PENDING" : "EMPTY" },
      create: { cartId, itemCount: cart.items.length, subtotal, email: cart.user?.email, status: cart.items.length ? "PENDING" : "EMPTY" },
    });
    await this.audit.log({ actorId: u.id, actorEmail: u.email, action: "abandoned_cart.snapshot", entity: "AbandonedCartSnapshot", entityId: snap.id, after: snap });
    return snap;
  }
}
