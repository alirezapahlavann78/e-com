import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../common/decorators/permissions.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("marketing-admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("marketing")
export class MarketingController {
  constructor(private prisma: PrismaService) {}
  @Permissions("crm:read") @Get("campaigns") campaigns() { return this.prisma.campaign.findMany({ include: { segment: true, _count: { select: { recipients: true, products: true, discountCodes: true } } }, orderBy: { createdAt: "desc" } }); }
  @Permissions("crm:read") @Get("campaigns/:id") campaign(@Param("id") id: string) { return this.prisma.campaign.findUnique({ where: { id }, include: { segment: true, products: { include: { product: { select: { id: true, name: true, slug: true } } } }, discountCodes: true, recipients: { take: 50, orderBy: { createdAt: "desc" } } } }); }
  @Permissions("crm:read") @Get("gift-cards") giftCards() { return this.prisma.giftCard.findMany({ orderBy: { createdAt: "desc" } }); }
  @Permissions("crm:read") @Get("abandoned-carts") abandonedCarts() { return this.prisma.abandonedCartSnapshot.findMany({ include: { cart: { select: { id: true, userId: true, guestToken: true, updatedAt: true } } }, orderBy: { lastEventAt: "desc" }, take: 100 }); }
}
