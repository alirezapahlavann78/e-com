import { api } from "../../../lib/api";
import { AddToCartButton } from "./add-to-cart";

type Product = { id: string; name: string; description?: string | null; basePrice: string | number | null; images?: { url: string; alt?: string | null }[]; variants?: { id: string; sku: string; title?: string | null; price: string | number | null; stockQuantity: number; attributes?: { attributeValue: { value: string; attribute: { name: string } } }[] }[]; relationsFrom?: { type: string; toProduct: { id: string; name: string; slug: string; basePrice: string | number | null } }[]; seo?: { metaTitle?: string | null; metaDescription?: string | null } };

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await api<Product>(`/catalog/products/${encodeURIComponent(slug)}`);

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="aspect-[4/5] rounded-3xl bg-stone-100">{p.images?.[0] ? <img src={p.images[0].url} alt={p.images[0].alt ?? p.name} className="h-full w-full rounded-3xl object-cover" /> : null}</div>
        <div>
          <h1 className="text-4xl font-semibold">{p.name}</h1>
          <p className="mt-4 text-2xl text-[var(--accent)]">{p.basePrice != null ? `${p.basePrice} تومان` : "انتخاب واریانت"}</p>
          <AddToCartButton productId={p.id} />
          {p.description ? <div className="mt-6 whitespace-pre-wrap leading-8 text-stone-700">{p.description}</div> : null}
          {p.variants?.length ? (
            <section className="mt-8">
              <h2 className="text-lg font-medium">واریانت‌ها</h2>
              <div className="mt-3 space-y-2">{p.variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
                  <span>{v.title ?? v.sku} {v.attributes?.length ? `(${v.attributes.map((a) => `${a.attributeValue.attribute.name}: ${a.attributeValue.value}`).join("، ")})` : ""}</span>
                  <span>{v.price ?? p.basePrice} — موجودی: {v.stockQuantity}</span>
                </div>
              ))}</div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
