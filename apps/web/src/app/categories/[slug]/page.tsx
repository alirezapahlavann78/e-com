import { api } from "../../../lib/api";
import { notFound } from "next/navigation";
import { PageRenderer } from "../../../components/cms/PageRenderer";
import { ProductGrid, type ProductCardData } from "../../../components/product-card";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<{ title: string; description?: string }> {
  const { slug } = await params;
  try {
    const resolved = await api<{ entity: { name: string; description?: string | null; seo?: { metaTitle?: string | null; metaDescription?: string | null } | null } }>(`/cms/resolve/category/${encodeURIComponent(slug)}`);
    return { title: resolved.entity.seo?.metaTitle ?? resolved.entity.name, description: resolved.entity.seo?.metaDescription ?? resolved.entity.description ?? undefined };
  } catch { return { title: "دسته‌بندی" }; }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const resolved = await api<{ entity: any; template?: any }>(`/cms/resolve/category/${encodeURIComponent(slug)}`);
    const c = resolved.entity;
    const products = await api<{ items: ProductCardData[] }>(`/catalog/products?category=${encodeURIComponent(slug)}&limit=24`).catch(() => ({ items: [] }));
    return (
      <main>
        <section className="mx-auto max-w-6xl px-6 py-12">
          <p className="eyebrow">دسته‌بندی</p>
          <h1 className="mt-2 font-display text-4xl">{c.name}</h1>
          {c.description ? <p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">{c.description}</p> : null}
        </section>
        {resolved.template?.publishedVersion?.sections?.length ? <PageRenderer sections={resolved.template.publishedVersion.sections} /> : null}
        <section className="mx-auto max-w-6xl px-6 pb-16">
          {products.items.length ? (
            <ProductGrid products={products.items} columns={3} />
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--line)] py-16 text-center text-[var(--muted)]">محصولی در این دسته منتشر نشده است.</p>
          )}
        </section>
      </main>
    );
  } catch { notFound(); }
}
