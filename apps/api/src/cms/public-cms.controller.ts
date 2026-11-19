import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CmsService } from "./cms.service";
import { CategoriesService } from "../categories/categories.service";
import { ProductsService } from "../products/products.service";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("cms")
@Public()
@Controller("cms")
export class PublicCmsController {
  constructor(private cms: CmsService, private categories: CategoriesService, private products: ProductsService, private prisma: PrismaService) {}
  @Get("home") home() { return this.cms.resolveHome(); }
  @Get("layout") layout() { return this.cms.getLayout("default"); }
  @Get("resolve/:kind/:slug")
  async resolve(@Param("kind") kind: string, @Param("slug") slug: string) {
    if (kind === "page") return this.cms.resolvePublicPage(slug);
    if (kind === "category") return { kind, entity: await this.categories.getPublicBySlug(slug), template: await this.cms.resolvePublicPage("category-template").catch(() => null) };
    if (kind === "product") return { kind, entity: await this.products.getPublicBySlug(slug), template: await this.cms.resolvePublicPage("product-template").catch(() => null) };
    if (kind === "brand") return { kind, entity: { slug }, template: await this.cms.resolvePublicPage(`brand-${slug}`).catch(() => this.cms.resolvePublicPage("brand-template").catch(() => null)) };
    throw new NotFoundException("Unknown kind");
  }
  @Get("pages/:slug") page(@Param("slug") slug: string) { return this.cms.resolvePublicPage(slug); }

  /** Everything the storefront sitemap needs in one request. */
  @Get("sitemap")
  async sitemap() {
    const [products, categories, pages, brands] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true }, orderBy: { publishedAt: "desc" } }),
      this.prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, orderBy: { sortOrder: "asc" } }),
      this.prisma.page.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true, type: true } }),
      this.prisma.product.findMany({ where: { status: "PUBLISHED", brand: { not: null } }, select: { brand: true }, distinct: ["brand"] }),
    ]);
    return {
      products,
      categories,
      pages,
      brands: brands.map((row) => ({ slug: String(row.brand) })).filter((row) => row.slug),
    };
  }
}
