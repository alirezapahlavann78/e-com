import Link from "next/link";
import { api } from "../../lib/api";

type Product = { id: string; name: string; slug: string; basePrice: string | number | null; shortDescription?: string | null; images?: { url: string; alt?: string | null }[]; variants?: { id: string; stockQuantity: number }[] };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const k of ["q", "category", "sort", "minPrice", "maxPrice", "inStock", "page"]) { const v = sp[k]; if (typeof v === "string" && v) qs.set(k, v); }
  const data = await api<{ items: Product[]; total: number; page: number; limit: number }>(`/catalog/products?${qs.toString()}`);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div><p className="text-sm tracking-[0.2em] text-[var(--accent)]">CATALOG</p><h1 className="mt-2 text-4xl font-semibold">محصولات</h1></div>
        <p className="text-sm text-stone-600">{data.total} محصول</p>
      </div>
      <form className="mt-6 grid gap-3 md:grid-cols-5" action="/products">
        <input name="q" defaultValue={typeof sp.q === "string" ? sp.q : ""} placeholder="جستجو" className="rounded-xl border border-stone-300 bg-white px-4 py-3 md:col-span-2" />
        <select name="sort" defaultValue={typeof sp.sort === "string" ? sp.sort : ""} className="rounded-xl border border-stone-300 bg-white px-4 py-3"><option value="">جدیدترین انتشار</option><option value="newest">جدیدترین</option><option value="price_asc">ارزان‌تر</option><option value="price_desc">گران‌تر</option></select>
        <label className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm"><input type="checkbox" name="inStock" value="true" defaultChecked={sp.inStock === "true"} /> فقط موجود</label>
        <button className="rounded-xl bg-stone-900 px-4 py-3 text-white">اعمال فیلتر</button>
      </form>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((p) => (
          <Link key={p.id} href={`/products/${p.slug}`} className="group rounded-2xl border border-stone-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5">
            <div className="aspect-[4/5] rounded-xl bg-stone-100">{p.images?.[0] ? <img src={p.images[0].url} alt={p.images[0].alt ?? p.name} className="h-full w-full rounded-xl object-cover" /> : null}</div>
            <h2 className="mt-4 text-lg font-medium group-hover:text-[var(--accent)]">{p.name}</h2>
            <p className="mt-1 text-sm text-stone-600">{p.basePrice != null ? `${p.basePrice} تومان` : "قیمت متغیر"}</p>
          </Link>
        ))}
      </div>
      {!data.items.length ? <p className="mt-10 rounded-xl border border-dashed border-stone-300 p-8 text-center text-stone-600">محصولی یافت نشد. API باید اجرا و داده منتشرشده داشته باشد.</p> : null}
    </main>
  );
}
