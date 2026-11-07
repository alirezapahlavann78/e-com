import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthUser } from "../common/decorators/current-user.decorator";
import type { CreatePageDto, SectionInputDto } from "./dto/page.dto";

const sectionTypes = new Set(["hero","image_slider","product_grid","product_carousel","featured_categories","best_sellers","new_arrivals","promotional_banners","brand_carousel","video","rich_text","image_text","testimonials","faq","newsletter","countdown"]);

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  listPages() { return this.prisma.page.findMany({ orderBy: { updatedAt: "desc" }, include: { publishedVersion: { select: { id: true, version: true } }, draftVersion: { select: { id: true, version: true } } } }); }

  async getPage(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" }, include: { sections: { orderBy: { sortOrder: "asc" } } } }, publishedVersion: { include: { sections: { orderBy: { sortOrder: "asc" } } } }, draftVersion: { include: { sections: { orderBy: { sortOrder: "asc" } } } } } });
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  async createPage(dto: CreatePageDto, actor: AuthUser) {
    this.validateSections(dto.sections);
    const result = await this.prisma.$transaction(async (tx) => {
      const page = await tx.page.create({ data: { title: dto.title, slug: dto.slug, type: dto.type ?? "CUSTOM", status: dto.status ?? "DRAFT", templateKey: dto.templateKey, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined, metaTitle: dto.metaTitle, metaDescription: dto.metaDescription } });
      const version = await tx.pageVersion.create({ data: { pageId: page.id, version: 1, label: "Draft", isPublished: false, sections: dto.sections?.length ? { create: dto.sections.map((s, i) => ({ type: s.type, sortOrder: s.sortOrder ?? i, isVisible: s.isVisible ?? true, config: s.config as object })) } : undefined } });
      return tx.page.update({ where: { id: page.id }, data: { draftVersionId: version.id, ...(dto.status === "PUBLISHED" ? { publishedVersionId: version.id, publishedAt: new Date(), status: "PUBLISHED" } : {}) } });
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "cms.page.create", entity: "Page", entityId: result.id, after: dto });
    return this.getPage(result.id);
  }

  async updatePage(id: string, dto: CreatePageDto, actor: AuthUser) {
    this.validateSections(dto.sections);
    const before = await this.prisma.page.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Page not found");
    await this.prisma.$transaction(async (tx) => {
      await tx.page.update({ where: { id }, data: { title: dto.title, slug: dto.slug, type: dto.type, status: dto.status, templateKey: dto.templateKey, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : dto.scheduledAt === null ? null : undefined, metaTitle: dto.metaTitle, metaDescription: dto.metaDescription } });
      if (dto.slug && dto.slug !== before.slug) await tx.redirect.upsert({ where: { fromPath: `/pages/${before.slug}` }, update: { toPath: `/pages/${dto.slug}`, isActive: true, entityType: "Page", entityId: id }, create: { fromPath: `/pages/${before.slug}`, toPath: `/pages/${dto.slug}`, entityType: "Page", entityId: id } });
      if (dto.sections) {
        const last = await tx.pageVersion.findFirst({ where: { pageId: id }, orderBy: { version: "desc" } });
        const version = await tx.pageVersion.create({ data: { pageId: id, version: (last?.version ?? 0) + 1, label: "Draft", isPublished: false, sections: { create: dto.sections.map((s, i) => ({ type: s.type, sortOrder: s.sortOrder ?? i, isVisible: s.isVisible ?? true, config: s.config as object })) } } });
        await tx.page.update({ where: { id }, data: { draftVersionId: version.id } });
      }
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "cms.page.update", entity: "Page", entityId: id, before, after: dto });
    return this.getPage(id);
  }

  async publishPage(id: string, actor: AuthUser, versionId?: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Page not found");
    const vid = versionId ?? page.draftVersionId ?? page.publishedVersionId;
    if (!vid) throw new BadRequestException("No version to publish");
    await this.prisma.$transaction(async (tx) => {
      await tx.pageVersion.updateMany({ where: { pageId: id }, data: { isPublished: false } });
      await tx.pageVersion.update({ where: { id: vid }, data: { isPublished: true } });
      await tx.page.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date(), publishedVersionId: vid } });
    });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "cms.page.publish", entity: "Page", entityId: id, after: { versionId: vid } });
    return this.getPage(id);
  }

  async removePage(id: string, actor: AuthUser) {
    const before = await this.prisma.page.findUnique({ where: { id } });
    if (!before) throw new NotFoundException("Page not found");
    await this.prisma.page.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "cms.page.delete", entity: "Page", entityId: id, before });
    return { ok: true };
  }

  async getLayout(key = "default") { return this.prisma.globalLayout.findUnique({ where: { key } }); }
  async upsertLayout(key: string, data: { header?: unknown; footer?: unknown }, actor: AuthUser) {
    const item = await this.prisma.globalLayout.upsert({ where: { key }, update: { header: data.header as object, footer: data.footer as object }, create: { key, header: data.header as object, footer: data.footer as object } });
    await this.audit.log({ actorId: actor.id, actorEmail: actor.email, action: "cms.layout.upsert", entity: "GlobalLayout", entityId: item.id, after: item });
    return item;
  }

  async menus() { return this.prisma.navigationMenu.findMany({ include: { items: { orderBy: { sortOrder: "asc" } } }, orderBy: { name: "asc" } }); }

  async resolvePublicPage(slug: string) {
    const page = await this.prisma.page.findFirst({ where: { slug, status: "PUBLISHED" }, include: { publishedVersion: { include: { sections: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } } } } } });
    if (!page?.publishedVersion) throw new NotFoundException("Page not found");
    return page;
  }

  async resolveHome() { return this.resolvePublicPage("home"); }

  private validateSections(sections?: SectionInputDto[]) {
    for (const s of sections ?? []) if (!sectionTypes.has(s.type)) throw new BadRequestException(`Unsupported section type: ${s.type}`);
  }
}
