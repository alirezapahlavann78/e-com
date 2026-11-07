import { notFound } from "next/navigation";
import { PageRenderer } from "../../../components/cms/PageRenderer";
import { api } from "../../../lib/api";

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const resolved = await api<{ entity: any; template?: any }>(`/cms/resolve/brand/${encodeURIComponent(slug)}`);
    return <main><section className="mx-auto max-w-6xl px-6 py-12"><p className="text-sm tracking-[0.2em] text-[var(--accent)]">BRAND</p><h1 className="mt-2 text-4xl font-semibold">{slug}</h1></section>{resolved.template?.publishedVersion?.sections?.length ? <PageRenderer sections={resolved.template.publishedVersion.sections} /> : <section className="mx-auto max-w-6xl px-6 pb-16 text-stone-600">Brand page generated dynamically. Add a CMS page `brand-{slug}` or `brand-template` to customize.</section>}</main>;
  } catch { notFound(); }
}
