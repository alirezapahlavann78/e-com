import Link from "next/link";

import { api } from "../lib/api";
import { formatPrice } from "../lib/format";
import { PriceFilter } from "./catalog-filters";
import { ProductGrid, type ProductCardData } from "./product-card";
import { CatalogToolbar } from "./catalog-toolbar";

type Category = {
  id: string;
  name: string;
  slug: string;
  children?: Category[];
  imageUrl?: string | null;
  description?: string | null;
};

export type CatalogParams = {
  q?: string;
  sort?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string;
  color?: string;
  size?: string;
  brand?: string;
  page?: string;
};

type Facet = { slug: string; value: string; count: number; hex?: string };
type BrandFacet = { value: string; count: number };
type Facets = {
  total: number;
  colors: Facet[];
  sizes: Facet[];
  brands: BrandFacet[];
  priceRange: { min: number; max: number };
};

const SORT_LABELS: Record<string, string> = {
  newest: "جدیدترین",
  price_asc: "ارزان‌ترین",
  price_desc: "گران‌ترین",
  best: "پرفروش‌ترین",
};

const EMPTY_FACETS: Facets = { total: 0, colors: [], sizes: [], brands: [], priceRange: { min: 0, max: 0 } };

const splitList = (value?: string) => (value ? value.split(",").filter(Boolean) : []);
const toggleInList = (value: string | undefined, slug: string) => {
  const current = splitList(value);
  const next = current.includes(slug) ? current.filter((entry) => entry !== slug) : [...current, slug];
  return next.length ? next.join(",") : undefined;
};

export async function CatalogView({
  title,
  description,
  image,
  params,
  fixedCategory,
  hideFilters = false,
}: {
  title: string;
  description?: string | null;
  image?: string | null;
  params: CatalogParams;
  fixedCategory?: string;
  hideFilters?: boolean;
}) {
  const category = fixedCategory ?? params.category;
  const selectedColors = splitList(params.color);
  const selectedSizes = splitList(params.size);
  const selectedBrands = splitList(params.brand);

  const search = new URLSearchParams();
  search.set("limit", "24");
  search.set("page", params.page ?? "1");
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  if (category) search.set("category", category);
  if (params.minPrice) search.set("minPrice", params.minPrice);
  if (params.maxPrice) search.set("maxPrice", params.maxPrice);
  if (params.inStock === "true") search.set("inStock", "true");
  if (params.color) search.set("color", params.color);
  if (params.size) search.set("size", params.size);
  if (params.brand) search.set("brand", params.brand);

  const facetQuery = new URLSearchParams();
  if (params.q) facetQuery.set("q", params.q);
  if (category) facetQuery.set("category", category);
  if (params.minPrice) facetQuery.set("minPrice", params.minPrice);
  if (params.maxPrice) facetQuery.set("maxPrice", params.maxPrice);
  if (params.inStock === "true") facetQuery.set("inStock", "true");
  if (params.brand) facetQuery.set("brand", params.brand);

  const [result, categories, facets] = await Promise.all([
    api<{ items: ProductCardData[]; total: number; page: number; limit: number }>(`/catalog/products?${search.toString()}`).catch(
      () => ({ items: [], total: 0, page: 1, limit: 24 }),
    ),
    api<Category[]>("/catalog/categories").catch(() => [] as Category[]),
    api<Facets>(`/catalog/facets?${facetQuery.toString()}`).catch(() => EMPTY_FACETS),
  ]);

  const basePath = fixedCategory ? `/categories/${fixedCategory}` : "/products";
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
  const currentPage = Number(result.page ?? 1);

  const colorLabel = (slug: string) => facets.colors.find((facet) => facet.slug === slug)?.value ?? slug;
  const sizeLabel = (slug: string) => facets.sizes.find((facet) => facet.slug === slug)?.value ?? slug;

  const activeChips: { label: string; href: string }[] = [
    ...selectedColors.map((slug) => ({ label: `رنگ: ${colorLabel(slug)}`, href: buildHref({ color: toggleInList(params.color, slug), page: undefined }) })),
    ...selectedSizes.map((slug) => ({ label: `سایز: ${sizeLabel(slug)}`, href: buildHref({ size: toggleInList(params.size, slug), page: undefined }) })),
    ...selectedBrands.map((brand) => ({ label: `برند: ${brand}`, href: buildHref({ brand: toggleInList(params.brand, brand), page: undefined }) })),
    ...(params.minPrice || params.maxPrice
      ? [{ label: `${params.minPrice ? formatPrice(Number(params.minPrice)) : "۰"} تا ${params.maxPrice ? formatPrice(Number(params.maxPrice)) : "بی‌نهایت"}`, href: buildHref({ minPrice: undefined, maxPrice: undefined, page: undefined }) }]
      : []),
    ...(params.inStock === "true" ? [{ label: "فقط موجود", href: buildHref({ inStock: undefined, page: undefined }) }] : []),
    ...(params.q ? [{ label: `جستجو: ${params.q}`, href: buildHref({ q: undefined, page: undefined }) }] : []),
  ];

  const filters = (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-xs font-bold">دسته‌بندی‌ها</p>
        <ul className="space-y-2 text-[13px] text-[var(--muted)]">
          <li>
            <Link
              href={buildHref({ category: undefined, page: undefined })}
              className={!category ? "font-semibold text-[var(--foreground)]" : "hover:text-[var(--foreground)]"}
            >
              همه محصولات
            </Link>
          </li>
          {categories.map((parent) => (
            <li key={parent.id} className="pt-2">
              <Link
                href={buildHref({ category: parent.slug, page: undefined })}
                className={
                  category === parent.slug
                    ? "font-semibold text-[var(--foreground)]"
                    : "font-medium text-[var(--foreground)]/80 hover:text-[var(--foreground)]"
                }
              >
                {parent.name}
              </Link>
              {parent.children?.length ? (
                <ul className="mt-2 space-y-1.5 border-r border-[var(--line)] pr-3">
                  {parent.children.map((child) => (
                    <li key={child.id}>
                      <Link
                        href={buildHref({ category: child.slug, page: undefined })}
                        className={category === child.slug ? "font-semibold text-[var(--accent-strong)]" : "hover:text-[var(--foreground)]"}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {facets.colors.length ? (
        <div>
          <p className="mb-3 flex items-center justify-between text-xs font-bold">
            رنگ
            {selectedColors.length ? (
              <Link href={buildHref({ color: undefined, page: undefined })} className="text-[10px] font-normal text-[var(--muted)] hover:text-[var(--danger)]">
                حذف
              </Link>
            ) : null}
          </p>
          <ul className="flex flex-wrap gap-2">
            {facets.colors.map((facet) => {
              const active = selectedColors.includes(facet.slug);
              return (
                <li key={facet.slug}>
                  <Link
                    href={buildHref({ color: toggleInList(params.color, facet.slug), page: undefined })}
                    title={`${facet.value} — ${facet.count.toLocaleString("fa-IR")} محصول`}
                    aria-label={facet.value}
                    aria-pressed={active}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                      active ? "border-[var(--ink)] ring-2 ring-[var(--accent)] ring-offset-2" : "border-[var(--line)] hover:border-[var(--ink)]"
                    }`}
                  >
                    <span
                      className="h-5 w-5 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: facet.hex ?? "#d9d0c2" }}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          {selectedColors.length ? (
            <p className="mt-2 text-[10.5px] text-[var(--muted)]">{selectedColors.map(colorLabel).join("، ")}</p>
          ) : null}
        </div>
      ) : null}

      {facets.sizes.length ? (
        <div>
          <p className="mb-3 flex items-center justify-between text-xs font-bold">
            سایز
            {selectedSizes.length ? (
              <Link href={buildHref({ size: undefined, page: undefined })} className="text-[10px] font-normal text-[var(--muted)] hover:text-[var(--danger)]">
                حذف
              </Link>
            ) : null}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {facets.sizes.map((facet) => {
              const active = selectedSizes.includes(facet.slug);
              return (
                <li key={facet.slug}>
                  <Link
                    href={buildHref({ size: toggleInList(params.size, facet.slug), page: undefined })}
                    className={`inline-flex h-8 min-w-9 items-center justify-center rounded-md border px-2 text-[11.5px] transition ${
                      active
                        ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                        : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {facet.value}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {facets.brands.length ? (
        <div>
          <p className="mb-3 flex items-center justify-between text-xs font-bold">
            برند
            {selectedBrands.length ? (
              <Link href={buildHref({ brand: undefined, page: undefined })} className="text-[10px] font-normal text-[var(--muted)] hover:text-[var(--danger)]">
                حذف
              </Link>
            ) : null}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {facets.brands.map((facet) => {
              const active = selectedBrands.includes(facet.value);
              return (
                <li key={facet.value}>
                  <Link
                    href={buildHref({ brand: toggleInList(params.brand, facet.value), page: undefined })}
                    className={`chip ${active ? "chip-active" : ""}`}
                  >
                    {facet.value}
                    <span className="ms-1 text-[9.5px] opacity-60">{facet.count.toLocaleString("fa-IR")}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="mb-3 flex items-center justify-between text-xs font-bold">
          محدوده قیمت
          {params.minPrice || params.maxPrice ? (
            <Link href={buildHref({ minPrice: undefined, maxPrice: undefined, page: undefined })} className="text-[10px] font-normal text-[var(--muted)] hover:text-[var(--danger)]">
              حذف
            </Link>
          ) : null}
        </p>
        <PriceFilter basePath={basePath} hintMax={facets.priceRange.max || undefined} />
      </div>

      <div>
        <p className="mb-3 text-xs font-bold">دسترسی</p>
        <Link
          href={buildHref({ inStock: params.inStock === "true" ? undefined : "true", page: undefined })}
          className={`chip ${params.inStock === "true" ? "chip-active" : ""}`}
        >
          فقط موجود
        </Link>
      </div>
    </div>
  );

  return (
    <div className="pb-16">
      <section className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="shell py-10 md:py-14">
          <nav className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
            <Link href="/" className="hover:text-[var(--foreground)]">خانه</Link>
            <span>/</span>
            <span className="text-[var(--foreground)]">{title}</span>
          </nav>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <h1 className="display-lg">{title}</h1>
              {description ? <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{description}</p> : null}
            </div>
            {image ? (
              <div className="hidden h-24 w-40 overflow-hidden rounded-2xl bg-[#ece4d6] md:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="h-full w-full object-cover" />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className={`shell ${hideFilters ? "" : "lg:grid lg:grid-cols-[240px_1fr] lg:gap-12"} pt-8`}>
        {hideFilters ? null : (
          <>
            <aside className="hidden lg:block">
              <div className="sticky top-24">{filters}</div>
            </aside>

            <details className="mb-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 lg:hidden">
              <summary className="cursor-pointer list-none text-xs font-bold">
                فیلترها
                {activeChips.length ? <span className="ms-2 text-[var(--accent-strong)]">{activeChips.length.toLocaleString("fa-IR")} فعال</span> : null}
              </summary>
              <div className="pt-6">{filters}</div>
            </details>
          </>
        )}

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted)]">
              {result.total.toLocaleString("fa-IR")} محصول
              {params.q ? <span> برای «{params.q}»</span> : null}
            </p>
            <CatalogToolbar basePath={basePath} params={params} sortLabels={SORT_LABELS} />
          </div>

          {activeChips.length ? (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] text-[var(--foreground)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                >
                  {chip.label}
                  <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href={basePath} className="text-[11px] font-semibold text-[var(--danger)]">
                حذف همه
              </Link>
            </div>
          ) : null}

          {result.items.length ? (
            <ProductGrid products={result.items} columns={3} />
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--line)] px-6 py-20 text-center">
              <p className="text-sm font-semibold">محصولی با این فیلترها پیدا نشد</p>
              <p className="mt-2 text-xs text-[var(--muted)]">فیلترها را تغییر دهید یا همه محصولات را ببینید.</p>
              <Link href="/products" className="btn btn-outline mt-6">
                همه محصولات
              </Link>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-12 flex items-center justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <Link
                    key={page}
                    href={buildHref({ page: String(page) })}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs ${
                      page === currentPage ? "bg-[var(--ink)] text-white" : "border border-[var(--line)] hover:border-[var(--ink)]"
                    }`}
                  >
                    {page.toLocaleString("fa-IR")}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
