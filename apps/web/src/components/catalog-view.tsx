import Link from "next/link";

import { api } from "../lib/api";
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
  page?: string;
};

const SORT_LABELS: Record<string, string> = {
  newest: "جدیدترین",
  price_asc: "ارزان‌ترین",
  price_desc: "گران‌ترین",
  best: "پرفروش‌ترین",
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
  const search = new URLSearchParams();
  search.set("limit", "24");
  search.set("page", params.page ?? "1");
  if (params.q) search.set("q", params.q);
  if (params.sort) search.set("sort", params.sort);
  const category = fixedCategory ?? params.category;
  if (category) search.set("category", category);
  if (params.minPrice) search.set("minPrice", params.minPrice);
  if (params.maxPrice) search.set("maxPrice", params.maxPrice);
  if (params.inStock === "true") search.set("inStock", "true");

  const [result, categories] = await Promise.all([
    api<{ items: ProductCardData[]; total: number; page: number; limit: number }>(`/catalog/products?${search.toString()}`).catch(
      () => ({ items: [], total: 0, page: 1, limit: 24 }),
    ),
    api<Category[]>("/catalog/categories").catch(() => [] as Category[]),
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
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              <div>
                <p className="mb-3 text-xs font-bold">دسته‌بندی‌ها</p>
                <ul className="space-y-2 text-[13px] text-[var(--muted)]">
                  <li>
                    <Link href={buildHref({ category: undefined, page: undefined })} className={!params.category ? "font-semibold text-[var(--foreground)]" : "hover:text-[var(--foreground)]"}>
                      همه محصولات
                    </Link>
                  </li>
                  {categories.map((parent) => (
                    <li key={parent.id} className="pt-2">
                      <Link
                        href={buildHref({ category: parent.slug, page: undefined })}
                        className={params.category === parent.slug ? "font-semibold text-[var(--foreground)]" : "font-medium text-[var(--foreground)]/80 hover:text-[var(--foreground)]"}
                      >
                        {parent.name}
                      </Link>
                      {parent.children?.length ? (
                        <ul className="mt-2 space-y-1.5 border-r border-[var(--line)] pr-3">
                          {parent.children.map((child) => (
                            <li key={child.id}>
                              <Link
                                href={buildHref({ category: child.slug, page: undefined })}
                                className={params.category === child.slug ? "font-semibold text-[var(--accent-strong)]" : "hover:text-[var(--foreground)]"}
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

              <div>
                <p className="mb-3 text-xs font-bold">محدوده قیمت</p>
                <div className="space-y-2 text-[13px] text-[var(--muted)]">
                  {[
                    { label: "تا ۲ میلیون", min: undefined, max: "2000000" },
                    { label: "۲ تا ۴ میلیون", min: "2000000", max: "4000000" },
                    { label: "۴ تا ۶ میلیون", min: "4000000", max: "6000000" },
                    { label: "بالای ۶ میلیون", min: "6000000", max: undefined },
                  ].map((range) => (
                    <Link
                      key={range.label}
                      href={buildHref({ minPrice: range.min, maxPrice: range.max, page: undefined })}
                      className={
                        params.minPrice === range.min && params.maxPrice === range.max
                          ? "block font-semibold text-[var(--foreground)]"
                          : "block hover:text-[var(--foreground)]"
                      }
                    >
                      {range.label}
                    </Link>
                  ))}
                </div>
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

              {(params.q || params.minPrice || params.maxPrice || params.inStock || params.sort) && (
                <Link href={basePath} className="inline-block text-xs font-semibold text-[var(--danger)]">
                  حذف همه فیلترها
                </Link>
              )}
            </div>
          </aside>
        )}

        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[var(--muted)]">
              {result.total.toLocaleString("fa-IR")} محصول
              {params.q ? <span> برای «{params.q}»</span> : null}
            </p>
            <CatalogToolbar basePath={basePath} params={params} sortLabels={SORT_LABELS} />
          </div>

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
