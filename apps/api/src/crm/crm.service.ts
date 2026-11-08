import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { CreateCustomerNoteDto, CreateSegmentDto, CreateTagDto, UpdateCustomerProfileDto } from "./dto/crm.dto";

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async listCustomers(query: { q?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page ?? 1)); const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where: any = { isAdmin: false };
    if (query.q) where.OR = [{ email: { contains: query.q, mode: "insensitive" } }, { firstName: { contains: query.q, mode: "insensitive" } }, { lastName: { contains: query.q, mode: "insensitive" } }];
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true, profile: true, _count: { select: { orders: true, reviews: true, wishlistItems: true } } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async customerDetail(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true, lastLoginAt: true, profile: true, addresses: true, orders: { take: 10, orderBy: { createdAt: "desc" }, select: { id: true, number: true, status: true, paymentStatus: true, total: true, createdAt: true } }, segmentLinks: { include: { segment: true } }, tagLinks: { include: { tag: true } }, notes: { take: 20, orderBy: { createdAt: "desc" } }, activities: { take: 30, orderBy: { createdAt: "desc" } }, reviews: { take: 10, orderBy: { createdAt: "desc" }, select: { id: true, productId: true, rating: true, status: true, createdAt: true } }, _count: { select: { orders: true, reviews: true, wishlistItems: true } } } });
    if (!user) throw new NotFoundException("Customer not found");
    const agg = await this.prisma.order.aggregate({ where: { userId: id, paymentStatus: "PAID" }, _sum: { total: true }, _count: true, _max: { createdAt: true } });
    return { ...user, ltv: { paidOrders: agg._count, total: agg._sum.total ?? 0, lastOrderAt: agg._max.createdAt } };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto, actor: AuthUser) {
    const profile = await this.prisma.customerProfile.upsert({ where: { userId }, update: dto, create: { userId, ...dto } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "crm.profile.update", entity: "CustomerProfile", entityId: profile.id, after: profile });
    return profile;
  }

  async addNote(userId: string, dto: CreateCustomerNoteDto, actor: AuthUser) {
    const note = await this.prisma.customerNote.create({ data: { userId, type: (dto.type as any) ?? "GENERAL", body: dto.body, actorId: actor.id, actorEmail: actor.email } });
    await this.prisma.customerActivity.create({ data: { userId, type: "NOTE_ADDED", entity: "CustomerNote", entityId: note.id, summary: "Admin note added" } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "crm.note.create", entity: "CustomerNote", entityId: note.id, after: note });
    return note;
  }

  listSegments() { return this.prisma.customerSegment.findMany({ include: { _count: { select: { members: true, campaigns: true, discountCodes: true } } }, orderBy: { createdAt: "desc" } }); }
  async createSegment(dto: CreateSegmentDto, actor: AuthUser) { const item = await this.prisma.customerSegment.create({ data: dto as any }); await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "crm.segment.create", entity: "CustomerSegment", entityId: item.id, after: item }); return item; }
  async assignSegment(segmentId: string, userId: string, actor: AuthUser) { const item = await this.prisma.customerSegmentMember.upsert({ where: { segmentId_userId: { segmentId, userId } }, update: {}, create: { segmentId, userId } }); await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "crm.segment.assign", entity: "CustomerSegmentMember", entityId: `${segmentId}:${userId}`, after: item }); return item; }
  async removeSegmentMember(segmentId: string, userId: string, actor: AuthUser) { await this.prisma.customerSegmentMember.deleteMany({ where: { segmentId, userId } }); await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "crm.segment.remove", entity: "CustomerSegmentMember", entityId: `${segmentId}:${userId}` }); return { ok: true }; }

  listTags() { return this.prisma.customerTag.findMany({ include: { _count: { select: { assignments: true } } }, orderBy: { name: "asc" } }); }
  async createTag(dto: CreateTagDto, actor: AuthUser) { const item = await this.prisma.customerTag.create({ data: dto }); await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "crm.tag.create", entity: "CustomerTag", entityId: item.id, after: item }); return item; }
  async assignTag(tagId: string, userId: string, actor: AuthUser) { const item = await this.prisma.customerTagAssignment.upsert({ where: { tagId_userId: { tagId, userId } }, update: {}, create: { tagId, userId } }); await this.prisma.customerActivity.create({ data: { userId, type: "TAG_ADDED", entity: "CustomerTag", entityId: tagId, summary: "Customer tag assigned" } }); await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "crm.tag.assign", entity: "CustomerTagAssignment", entityId: `${tagId}:${userId}`, after: item }); return item; }
  async removeTag(tagId: string, userId: string, actor: AuthUser) { await this.prisma.customerTagAssignment.deleteMany({ where: { tagId, userId } }); await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "crm.tag.remove", entity: "CustomerTagAssignment", entityId: `${tagId}:${userId}` }); return { ok: true }; }

  async myProfile(userId: string) {
    await this.prisma.customerProfile.upsert({ where: { userId }, update: {}, create: { userId } });
    return this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, profile: true, addresses: true, tagLinks: { include: { tag: true } } } });
  }
}
