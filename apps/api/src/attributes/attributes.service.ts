import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { CreateAttributeDto } from "./dto/create-attribute.dto";
import type { UpdateAttributeDto } from "./dto/update-attribute.dto";

@Injectable()
export class AttributesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  list() { return this.prisma.attribute.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { values: { orderBy: { sortOrder: "asc" } } } }); }

  async get(id: string) {
    const item = await this.prisma.attribute.findUnique({ where: { id }, include: { values: { orderBy: { sortOrder: "asc" } } } });
    if (!item) throw new NotFoundException("Attribute not found");
    return item;
  }

  async create(dto: CreateAttributeDto, actor: AuthUser) {
    const item = await this.prisma.attribute.create({ data: { name: dto.name, slug: dto.slug, sortOrder: dto.sortOrder ?? 0, values: dto.values?.length ? { create: dto.values } : undefined }, include: { values: true } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "attribute.create", entity: "Attribute", entityId: item.id, after: item });
    return item;
  }

  async update(id: string, dto: UpdateAttributeDto, actor: AuthUser) {
    const before = await this.get(id);
    const item = await this.prisma.$transaction(async (tx) => {
      if (dto.values) await tx.attributeValue.deleteMany({ where: { attributeId: id } });
      return tx.attribute.update({ where: { id }, data: { name: dto.name, slug: dto.slug, sortOrder: dto.sortOrder, values: dto.values ? { create: dto.values } : undefined }, include: { values: { orderBy: { sortOrder: "asc" } } } });
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "attribute.update", entity: "Attribute", entityId: id, before, after: item });
    return item;
  }

  async remove(id: string, actor: AuthUser) {
    const before = await this.get(id);
    await this.prisma.attribute.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "attribute.delete", entity: "Attribute", entityId: id, before });
    return { ok: true };
  }
}
