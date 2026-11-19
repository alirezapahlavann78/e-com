import Link from "next/link";
import { api } from "../../lib/api";
import { ProductGrid, type ProductCardData } from "../product-card";

type Section = { id: string; type: string; config: Record<string, any>; isVisible: boolean };

async function fetchProducts(config: Record<string, any>): Promise<ProductCardData[]> {
  const limit = Number(config.limit ?? 6);
  const params = new URLSearchParams({ limit: String(limit) });
  if (config.sort) params.set("sort", String(config.sort));
  try {
    const data = await api<{ items: ProductCardData[] }>(`/catalog/products?${params}`);
    return data.items ?? [];
  } catch { return []; }
}

async function Hero({ config }: { config: Record<string, any> }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-14 pb-10">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1a1713] px-8 py-20 text-center text-white md:py-28">
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 20% 20%, #c9a87c 0%, transparent 45%), radial-gradient(circle at 80% 80%, #9a6b3f 0%, transparent 45%)" }} />
        {config.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(config.image)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        ) : null}
        <div className="relative fade-up">
          {config.eyebrow ? <p className="eyebrow" style={{ color: "var(--accent-soft)" }}>{config.eyebrow}</p> : null}
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl leading-tight md:text-6xl">{config.title}</h1>
          {config.subtitle ? <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">{config.subtitle}</p> : null}
          {config.ctaHref && config.ctaLabel ? (
            <Link href={String(config.ctaHref)} className="mt-10 inline-block rounded-full bg-white px-8 py-3.5 text-sm font-medium text-[#1a1713] transition hover:bg-[var(--accent-soft)] hover:text-white">{config.ctaLabel}</Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

async function FeaturedCategories({ config }: { config: Record<string, any> }) {
  let items: { id: string; name: string; slug: string; image?: { url: string } | null }[] = [];
  try { items = await api<typeof items>("/catalog/categories"); } catch {}
  const top = (config.parentSlug ? items : items).slice(0, Number(config.limit ?? 4));
  if (!top.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      {config.title ? <h2 className="font-display text-3xl">{config.title}</h2> : <h2 className="font-display text-3xl">دسته‌بندی‌ها</h2>}
      <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {top.map((c) => (
          <Link key={c.id} href={`/categories/${c.slug}`} className="card-hover group relative overflow-hidden rounded-2xl bg-[#efe9df]">
            <div className="aspect-square">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image.url} alt={c.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex h-full items-center justify-center font-display text-xl text-[var(--muted)]">{c.name}</div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-white">{c.name}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function PromotionalBanner({ config }: { config: Record<string, any> }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-col items-center gap-6 rounded-[2rem] border border-[var(--line)] bg-[var(--accent-soft)]/15 px-8 py-14 text-center md:flex-row md:text-right">
        <div className="flex-1">
          {config.eyebrow ? <p className="eyebrow">{config.eyebrow}</p> : null}
          <h2 className="mt-3 font-display text-3xl md:text-4xl">{config.title}</h2>
          {config.subtitle ? <p className="mt-4 leading-8 text-[var(--muted)]">{config.subtitle}</p> : null}
        </div>
        {config.ctaHref && config.ctaLabel ? <Link href={String(config.ctaHref)} className="rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-medium text-white transition hover:opacity-90">{config.ctaLabel}</Link> : null}
      </div>
    </section>
  );
}

function RichText({ config }: { config: Record<string, any> }) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-10">
      {config.title ? <h2 className="font-display text-3xl">{config.title}</h2> : null}
      <div className="mt-4 whitespace-pre-wrap text-base leading-9 text-[var(--muted)]">{config.body ?? config.text ?? ""}</div>
    </section>
  );
}

async function ProductSection({ config, sectionTitle }: { config: Record<string, any>; sectionTitle?: string }) {
  const items = await fetchProducts(config);
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-end justify-between">
        <h2 className="font-display text-3xl">{config.title ?? sectionTitle}</h2>
        <Link href="/products" className="link-underline text-sm text-[var(--muted)]">مشاهده همه</Link>
      </div>
      <div className="mt-8"><ProductGrid products={items} columns={(config.columns as 3) ?? 3} /></div>
    </section>
  );
}

function Newsletter({ config }: { config: Record<string, any> }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="rounded-[2rem] bg-[#1a1713] px-8 py-14 text-center text-white">
        <h2 className="font-display text-3xl">{config.title ?? "عضویت در خبرنامه"}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/60">{config.subtitle ?? "از تخفیف‌ها و محصولات جدید زودتر باخبر شوید."}</p>
        <form className="mx-auto mt-6 flex max-w-md gap-2" onSubmit={(e) => e.preventDefault()}>
          <input type="email" required placeholder="ایمیل شما" className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm placeholder:text-white/40" />
          <button type="submit" className="rounded-full bg-[var(--accent-soft)] px-6 py-3 text-sm font-medium text-[#1a1713]">عضویت</button>
        </form>
      </div>
    </section>
  );
}

function Generic({ type, config }: { type: string; config: Record<string, any> }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-8">
      <div className="rounded-2xl border border-dashed border-[var(--line)] p-6 text-sm text-[var(--muted)]">
        بخش <b>{type}</b>
        <pre className="mt-3 overflow-auto text-xs leading-6">{JSON.stringify(config, null, 2)}</pre>
      </div>
    </section>
  );
}

export async function PageRenderer({ sections }: { sections: Section[] }) {
  const visible = sections.filter((s) => s.isVisible !== false);
  return (
    <div>
      {await Promise.all(visible.map(async (s) => {
        const config = s.config ?? {};
        switch (s.type) {
          case "hero": return <Hero key={s.id} config={config} />;
          case "product_grid": return <ProductSection key={s.id} config={config} />;
          case "new_arrivals": return <ProductSection key={s.id} config={{ ...config, sort: config.sort ?? "newest" }} sectionTitle="جدیدترین‌ها" />;
          case "best_sellers": return <ProductSection key={s.id} config={config} sectionTitle="پرفروش‌ها" />;
          case "product_carousel": return <ProductSection key={s.id} config={config} />;
          case "featured_categories": case "categories": return <FeaturedCategories key={s.id} config={config} />;
          case "promo_banner": case "promotional_banner": return <PromotionalBanner key={s.id} config={config} />;
          case "rich_text": return <RichText key={s.id} config={config} />;
          case "newsletter": return <Newsletter key={s.id} config={config} />;
          default: return <Generic key={s.id} type={s.type} config={config} />;
        }
      }))}
    </div>
  );
}
