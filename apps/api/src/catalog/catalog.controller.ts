import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { CategoriesService } from "../categories/categories.service";
import { ProductsService } from "../products/products.service";
import { PrismaService } from "../prisma/prisma.service";

const splitList = (value?: string) => (value ? value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 24) : undefined);

@ApiTags("catalog")
@Public()
@Controller("catalog")
export class CatalogController {
  constructor(private categories: CategoriesService, private products: ProductsService, private prisma: PrismaService) {}

  @Get("categories") tree() { return this.categories.tree(); }

  @Get("categories/:slug")
  async category(@Param("slug") slug: string) {
    const item = await this.prisma.category.findFirst({ where: { slug, isActive: true }, include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } }, parent: true } });
    if (!item) throw new NotFoundException("Category not found");
    return item;
  }

  @Get("products")
  list(
    @Query("page") page = "1", @Query("limit") limit = "20", @Query("q") q?: string, @Query("category") category?: string,
    @Query("sort") sort?: string, @Query("minPrice") minPrice?: string, @Query("maxPrice") maxPrice?: string, @Query("inStock") inStock?: string,
    @Query("color") color?: string, @Query("size") size?: string, @Query("brand") brand?: string,
  ) {
    return this.products.listPublic(
      Number(page), Number(limit), q, category, sort,
      minPrice ? Number(minPrice) : undefined, maxPrice ? Number(maxPrice) : undefined, inStock === "true",
      splitList(color), splitList(size), splitList(brand),
    );
  }

  @Get("facets")
  facets(
    @Query("q") q?: string, @Query("category") category?: string,
    @Query("minPrice") minPrice?: string, @Query("maxPrice") maxPrice?: string, @Query("inStock") inStock?: string,
    @Query("brand") brand?: string,
  ) {
    return this.products.facets({
      q, categorySlug: category,
      minPrice: minPrice ? Number(minPrice) : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined,
      inStock: inStock === "true", brands: splitList(brand),
    });
  }

  @Get("search/autocomplete")
  autocomplete(@Query("q") q = "", @Query("limit") limit = "8") { return this.products.autocomplete(q, Number(limit)); }

  @Get("products/:slug")
  detail(@Param("slug") slug: string) { return this.products.getPublicBySlug(slug); }
}
