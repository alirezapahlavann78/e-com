import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { UpdateCategoryDto } from "./dto/update-category.dto";

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async listAdmin() {
    return this.prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { parent: { select: { id: true, name: true } } } });
  }

  async tree() {
    const all = await this.prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    const byId = new Map(all.map((c) => [c.id, { ...c, children: [] as unknown[] }]));
    const roots: unknown[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) byId.get(node.parentId)!.children.push(node);
      else roots.push(node);
    }
    return roots;
  }

  async get(id: string) {
    const item = await this.prisma.category.findUnique({ where: { id }, include: { parent: true, children: { orderBy: { sortOrder: "asc" } } } });
    if (!item) throw new NotFoundException("Category not found");
    return item;
  }

  async create(dto: CreateCategoryDto, actor: AuthUser) {
    const item = await this.prisma.category.create({ data: dto });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "category.create", entity: "Category", entityId: item.id, after: item });
    return item;
  }

  async update(id: string, dto: UpdateCategoryDto, actor: AuthUser) {
    const before = await this.prisma.category.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Category not found");
    const item = await this.prisma.category.update({ where: { id }, data: dto });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "category.update", entity: "Category", entityId: id, before, after: item });
    return item;
  }

  async remove(id: string, actor: AuthUser) {
    const before = await this.prisma.category.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Category not found");
    await this.prisma.category.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "category.delete", entity: "Category", entityId: id, before });
    return { ok: true };
  }
}
