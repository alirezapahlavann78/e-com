import Link from "next/link";
import { api } from "../../lib/api";
import { ProductGrid, type ProductCardData } from "../../components/product-card";

export const metadata = { title: "محصولات" };

type SearchParams = { q?: string; category?: string; sort?: string; minPrice?: string; maxPrice?: string; inStock?: string; page?: string };

const SORTS = [
  { value: "", label: "پیش‌فرض" },
  { value: "newest", label: "جدیدترین" },
  { value: "price_asc", label: "ارزان‌ترین" },
  { value: "price_desc", label: "گران‌ترین" },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(Number(sp.page ?? 1), 1);
  const params = new URLSearchParams({ page: String(page), limit: "12" });
  for (const [k, v] of Object.entries(sp)) if (v) params.set(k, String(v));

  const [data, categories] = await Promise.all([
    api<{ items: ProductCardData[]; total: number; page: number; limit: number }>(`/catalog/products?${params}`).catch(() => ({ items: [], total: 0, page: 1, limit: 12 })),
    api<{ id: string; name: string; slug: string }[]>("/catalog/categories").catch(() => []),
  ]);

  const totalPages = Math.max(Math.ceil(data.total / data.limit), 1);
  const buildHref = (overrides: Partial<SearchParams>) => {
    const next = new URLSearchParams(Object.entries({ ...sp, ...overrides }).filter(([, v]) => v != null && v !== "") as [string, string][]);
    if (page > 1 || overrides.page) next.set("page", String(overrides.page ?? page));
    else next.delete("page");
    return `/products${next.size ? `?${next}` : ""}`;
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">فروشگاه</p>
          <h1 className="mt-2 font-display text-4xl">محصولات</h1>
        </div>
        <p className="text-sm text-[var(--muted)]">{data.total.toLocaleString("fa-IR")} محصول</p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6">
          <form className="space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5" action="/products">
            <div>
              <label className="text-sm font-medium">جستجو</label>
              <input name="q" defaultValue={sp.q ?? ""} placeholder="نام محصول…" className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">دسته‌بندی</label>
              <select name="category" defaultValue={sp.category ?? ""} className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm">
                <option value="">همه</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">محدوده قیمت (تومان)</label>
              <div className="mt-2 flex gap-2">
                <input name="minPrice" type="number" defaultValue={sp.minPrice ?? ""} placeholder="از" className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm" />
                <input name="maxPrice" type="number" defaultValue={sp.maxPrice ?? ""} placeholder="تا" className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3 py-2.5 text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" name="inStock" value="true" defaultChecked={sp.inStock === "true"} className="h-4 w-4 accent-[var(--accent)]" />
              فقط کالاهای موجود
            </label>
            <select name="sort" defaultValue={sp.sort ?? ""} className="hidden">
              {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button type="submit" className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition hover:opacity-90">اعمال فیلتر</button>
          </form>
        </aside>

        <div>
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => {
              const active = (sp.sort ?? "") === s.value;
              return (
                <Link key={s.value} href={buildHref({ sort: s.value, page: "1" })}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${active ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] hover:border-[var(--accent)]"}`}>
                  {s.label}
                </Link>
              );
            })}
          </div>

          {data.items.length ? (
            <div className="mt-6"><ProductGrid products={data.items} columns={3} /></div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] py-20 text-center text-[var(--muted)]">محصولی با این فیلترها یافت نشد.</div>
          )}

          {totalPages > 1 && (
            <nav className="mt-10 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => String(i + 1)).map((p) => (
                <Link key={p} href={buildHref({ page: p })} className={`min-w-10 rounded-xl border px-3.5 py-2 text-center text-sm ${p === String(page) ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] hover:border-[var(--accent)]"}`}>
                  {Number(p).toLocaleString("fa-IR")}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}
