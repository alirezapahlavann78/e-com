import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@ecom/db";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateDiscountCodeDto, UpdateDiscountCodeDto } from "./dto/discounts.dto";

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  list() { return this.prisma.discountCode.findMany({ include: { campaign: true, segment: true, _count: { select: { orders: true, redemptions: true } } }, orderBy: { createdAt: "desc" } }); }
  async get(id: string) { const item = await this.prisma.discountCode.findUnique({ where: { id }, include: { campaign: true, segment: true } }); if (!item) throw new NotFoundException("Discount code not found"); return item; }

  async create(dto: CreateDiscountCodeDto, actor: AuthUser) {
    const item = await this.prisma.discountCode.create({ data: { ...dto, code: dto.code.trim().toUpperCase(), startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined, endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined, campaignId: dto.campaignId || undefined, segmentId: dto.segmentId || undefined } as Prisma.DiscountCodeUncheckedCreateInput });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "discount.create", entity: "DiscountCode", entityId: item.id, after: item });
    return item;
  }
  async update(id: string, dto: UpdateDiscountCodeDto, actor: AuthUser) {
    const before = await this.get(id);
    const item = await this.prisma.discountCode.update({ where: { id }, data: { ...dto, code: dto.code?.trim().toUpperCase(), startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined, endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined, campaignId: dto.campaignId === "" ? null : dto.campaignId, segmentId: dto.segmentId === "" ? null : dto.segmentId } as any });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "discount.update", entity: "DiscountCode", entityId: id, before, after: item });
    return item;
  }
  async remove(id: string, actor: AuthUser) { const before = await this.get(id); await this.prisma.discountCode.delete({ where: { id } }); await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "discount.delete", entity: "DiscountCode", entityId: id, before }); return { ok: true }; }

  async resolveActive(code: string, subtotal: number, userId?: string) {
    const dc = await this.prisma.discountCode.findUnique({ where: { code: code.trim().toUpperCase() }, include: { segment: { include: { members: userId ? { where: { userId } } : false } } } });
    if (!dc || !dc.isActive) throw new BadRequestException("Discount code is invalid");
    const now = new Date();
    if (dc.startsAt && dc.startsAt > now) throw new BadRequestException("Discount code is not active yet");
    if (dc.endsAt && dc.endsAt < now) throw new BadRequestException("Discount code has expired");
    if (dc.maxUses && dc.usedCount >= dc.maxUses) throw new BadRequestException("Discount code usage limit reached");
    if (dc.minOrderAmount && subtotal < Number(dc.minOrderAmount)) throw new BadRequestException("Order subtotal does not meet discount minimum");
    if (dc.segmentId && !userId) throw new BadRequestException("This discount requires a customer account");
    if (dc.segmentId && userId && !(dc.segment as any)?.members?.length) throw new BadRequestException("Discount code is not available for this customer");
    let discountAmount = 0;
    if (dc.type === "PERCENT") discountAmount = Math.min(subtotal, (subtotal * Number(dc.value)) / 100);
    else if (dc.type === "FIXED_AMOUNT") discountAmount = Math.min(subtotal, Number(dc.value));
    else if (dc.type === "FREE_SHIPPING") discountAmount = 0;
    return { discountCode: dc, discountAmount: Number(discountAmount.toFixed(2)), freeShipping: dc.type === "FREE_SHIPPING" };
  }
}
