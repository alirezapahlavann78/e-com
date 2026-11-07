import Link from "next/link";
import { api } from "../../lib/api";

type Section = { id: string; type: string; config: Record<string, any>; isVisible: boolean };
type Product = { id: string; name: string; slug: string; basePrice: string | number | null; images?: { url: string }[] };

async function ProductGrid({ config }: { config: Record<string, any> }) {
  const limit = Number(config.limit ?? 6);
  const data = await api<{ items: Product[] }>(`/catalog/products?limit=${limit}`).catch(() => ({ items: [] }));
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      {config.title ? <h2 className="text-3xl font-semibold">{config.title}</h2> : null}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((p) => (
          <Link key={p.id} href={`/products/${p.slug}`} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="aspect-[4/5] rounded-xl bg-stone-100">{p.images?.[0] ? <img src={p.images[0].url} alt={p.name} className="h-full w-full rounded-xl object-cover" /> : null}</div>
            <div className="mt-3 font-medium">{p.name}</div>
            <div className="text-sm text-stone-600">{p.basePrice != null ? `${p.basePrice} تومان` : "—"}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Hero({ config }: { config: Record<string, any> }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="rounded-[2rem] bg-stone-900 px-8 py-14 text-white">
        {config.eyebrow ? <p className="text-sm tracking-[0.25em] text-stone-300">{config.eyebrow}</p> : null}
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">{config.title}</h1>
        {config.subtitle ? <p className="mt-5 max-w-2xl text-lg text-stone-300">{config.subtitle}</p> : null}
        {config.ctaHref && config.ctaLabel ? <Link href={config.ctaHref} className="mt-8 inline-block rounded-xl bg-white px-5 py-3 text-stone-900">{config.ctaLabel}</Link> : null}
      </div>
    </section>
  );
}

function RichText({ config }: { config: Record<string, any> }) {
  return <section className="mx-auto max-w-4xl px-6 py-10 prose prose-stone"><h2>{config.title}</h2><div className="whitespace-pre-wrap">{config.body ?? config.text ?? ""}</div></section>;
}

function Generic({ type, config }: { type: string; config: Record<string, any> }) {
  return <section className="mx-auto max-w-6xl px-6 py-8"><div className="rounded-xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">Section <b>{type}</b> — DB config loaded. <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(config, null, 2)}</pre></div></section>;
}

export async function PageRenderer({ sections }: { sections: Section[] }) {
  return <div>{await Promise.all(sections.map(async (s) => {
    if (s.type === "hero") return <Hero key={s.id} config={s.config} />;
    if (s.type === "product_grid" || s.type === "new_arrivals" || s.type === "best_sellers") return <ProductGrid key={s.id} config={s.config} />;
    if (s.type === "rich_text") return <RichText key={s.id} config={s.config} />;
    return <Generic key={s.id} type={s.type} config={s.config} />;
  }))}</div>;
}
