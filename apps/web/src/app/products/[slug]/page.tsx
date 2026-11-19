import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "../../../lib/api";
import { formatPrice } from "../../../lib/format";
import { AddToCartButton } from "./add-to-cart";
import { ProductReviews, WishlistButton } from "./reviews-wishlist";
import { ProductCard } from "../../../components/product-card";

type Image = { url: string; alt?: string | null };
type Product = {
  id: string; name: string; slug: string; shortDescription?: string | null; description?: string | null;
  basePrice: string | number | null; compareAtPrice?: string | number | null; sku?: string | null;
  images?: Image[];
  brand?: { name: string; slug: string } | null;
  categories?: { category: { name: string; slug: string } }[];
  variants?: { id: string; sku: string; title?: string | null; price: string | number | null; stockQuantity: number; attributes?: { attributeValue: { value: string; attribute: { name: string } } }[] }[];
  relationsFrom?: { type: string; toProduct: { id: string; name: string; slug: string; basePrice: string | number | null; images?: Image[] } }[];
  seo?: { metaTitle?: string | null; metaDescription?: string | null } | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<{ title: string; description?: string }> {
  const { slug } = await params;
  try {
    const p = await api<Product>(`/catalog/products/${encodeURIComponent(slug)}`);
    return { title: p.seo?.metaTitle ?? p.name, description: p.seo?.metaDescription ?? p.shortDescription ?? undefined };
  } catch { return { title: "محصول" }; }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let p: Product;
  try { p = await api<Product>(`/catalog/products/${encodeURIComponent(slug)}`); } catch { notFound(); }
  const images = p.images ?? [];
  const onSale = p.compareAtPrice != null && Number(p.compareAtPrice) > Number(p.basePrice ?? 0);
  const related = (p.relationsFrom ?? []).filter((r) => r.type === "RELATED").map((r) => r.toProduct);
  const inStock = (p.variants?.length ? p.variants.some((v) => v.stockQuantity > 0) : true);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/" className="link-underline">خانه</Link>
        <span>/</span>
        <Link href="/products" className="link-underline">محصولات</Link>
        {p.categories?.[0] && (<><span>/</span><Link href={`/categories/${p.categories[0].category.slug}`} className="link-underline">{p.categories[0].category.name}</Link></>)}
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#efe9df]">
            {images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={images[0].url} alt={images[0].alt ?? p.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-2xl text-[var(--muted)]">AGHACI</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img.url} alt={img.alt ?? `${p.name} ${i + 1}`} className="h-24 w-20 flex-shrink-0 rounded-xl border border-[var(--line)] object-cover" />
              ))}
            </div>
          )}
        </div>

        <div>
          {p.brand && <Link href={`/brands/${p.brand.slug}`} className="eyebrow">{p.brand.name}</Link>}
          <h1 className="mt-2 font-display text-4xl leading-snug">{p.name}</h1>
          {p.shortDescription ? <p className="mt-4 leading-8 text-[var(--muted)]">{p.shortDescription}</p> : null}

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-[var(--accent)]">{formatPrice(p.basePrice)}</span>
            {onSale && <span className="text-lg text-[var(--muted)] line-through">{formatPrice(p.compareAtPrice)}</span>}
          </div>

          <p className={`mt-3 text-sm ${inStock ? "text-emerald-700" : "text-red-700"}`}>{inStock ? "موجود در انبار" : "ناموجود"}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton productId={p.id} />
            <WishlistButton productId={p.id} />
          </div>

          {p.sku && <p className="mt-4 text-xs text-[var(--muted)]">کد کالا: {p.sku}</p>}

          {p.description && (
            <section className="mt-8 border-t border-[var(--line)] pt-8">
              <h2 className="font-medium">توضیحات</h2>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-8 text-[var(--muted)]">{p.description}</div>
            </section>
          )}

          {p.variants?.length ? (
            <section className="mt-8 border-t border-[var(--line)] pt-8">
              <h2 className="font-medium">گزینه‌ها</h2>
              <div className="mt-3 space-y-2">
                {p.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3 text-sm">
                    <span>
                      {v.title ?? v.sku}
                      {v.attributes?.length ? <span className="text-[var(--muted)]"> ({v.attributes.map((a) => `${a.attributeValue.attribute.name}: ${a.attributeValue.value}`).join("، ")})</span> : null}
                    </span>
                    <span className="flex-shrink-0">{formatPrice(v.price ?? p.basePrice)} — {v.stockQuantity > 0 ? `موجودی: ${v.stockQuantity.toLocaleString("fa-IR")}` : "ناموجود"}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <section className="mt-16 border-t border-[var(--line)] pt-10">
        <ProductReviews slug={p.slug ?? slug} />
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl">محصولات مرتبط</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      )}
    </main>
  );
}
