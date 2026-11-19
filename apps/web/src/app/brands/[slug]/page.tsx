import { notFound } from "next/navigation";
import { PageRenderer } from "../../../components/cms/PageRenderer";
import { api } from "../../../lib/api";
import { ProductGrid, type ProductCardData } from "../../../components/product-card";

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const resolved = await api<{ entity: any; template?: any }>(`/cms/resolve/brand/${encodeURIComponent(slug)}`);
    const products = await api<{ items: ProductCardData[] }>(`/catalog/products?q=${encodeURIComponent(slug)}&limit=24`).catch(() => ({ items: [] }));
    return (
      <main>
        <section className="mx-auto max-w-6xl px-6 py-12">
          <p className="eyebrow">برند</p>
          <h1 className="mt-2 font-display text-4xl">{resolved.entity?.name ?? slug}</h1>
        </section>
        {resolved.template?.publishedVersion?.sections?.length
          ? <PageRenderer sections={resolved.template.publishedVersion.sections} />
          : null}
        {products.items.length > 0 && (
          <section className="mx-auto max-w-6xl px-6 pb-16">
            <h2 className="font-display text-2xl">محصولات این برند</h2>
            <div className="mt-6"><ProductGrid products={products.items} columns={3} /></div>
          </section>
        )}
      </main>
    );
  } catch { notFound(); }
}
