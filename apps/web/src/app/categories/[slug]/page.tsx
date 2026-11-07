import { api } from "../../../lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageRenderer } from "../../../components/cms/PageRenderer";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const resolved = await api<{ entity: any; template?: any }>(`/cms/resolve/category/${encodeURIComponent(slug)}`);
    const c = resolved.entity;
    const products = await api<{ items: any[] }>(`/catalog/products?category=${encodeURIComponent(slug)}&limit=24`);
    return <main><section className="mx-auto max-w-6xl px-6 py-12"><p className="text-sm tracking-[0.2em] text-[var(--accent)]">CATEGORY</p><h1 className="mt-2 text-4xl font-semibold">{c.name}</h1>{c.description ? <p className="mt-4 max-w-3xl text-stone-700">{c.description}</p> : null}</section>{resolved.template?.publishedVersion?.sections?.length ? <PageRenderer sections={resolved.template.publishedVersion.sections} /> : null}<section className="mx-auto max-w-6xl px-6 pb-16"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.items.map((p) => <Link key={p.id} href={`/products/${p.slug}`} className="rounded-2xl border border-stone-200 bg-white p-4"><div className="font-medium">{p.name}</div><div className="text-sm text-stone-600">{p.basePrice ?? "—"}</div></Link>)}</div>{!products.items.length ? <p className="text-stone-600">محصولی در این دسته منتشر نشده است.</p> : null}</section></main>;
  } catch { notFound(); }
}
