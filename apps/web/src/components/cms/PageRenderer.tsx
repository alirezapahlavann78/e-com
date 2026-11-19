import Link from "next/link";

import { api } from "../../lib/api";
import { ProductCard, ProductGrid, ProductRail, type ProductCardData } from "../product-card";
import { Newsletter } from "./Newsletter";
import { Countdown } from "./Countdown";

export type Section = {
  id: string;
  type: string;
  config: Record<string, any>;
  isVisible: boolean;
};

type Category = { id: string; name: string; slug: string; imageUrl?: string | null; description?: string | null };

async function fetchProducts(config: Record<string, any>, defaultSort?: string): Promise<ProductCardData[]> {
  const params = new URLSearchParams({
    limit: String(config.limit ?? 4),
  });
  const sort = config.sort ?? defaultSort;
  if (sort) params.set("sort", sort);
  if (config.category) params.set("category", String(config.category));
  if (config.inStock) params.set("inStock", "true");
  try {
    const data = await api<{ items: ProductCardData[] }>(`/catalog/products?${params.toString()}`);
    return data.items ?? [];
  } catch {
    return [];
  }
}

async function fetchCategories(limit = 6): Promise<Category[]> {
  try {
    const data = await api<Category[]>("/catalog/categories");
    return data.slice(0, limit);
  } catch {
    return [];
  }
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: { label: string; href: string };
}) {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        {title ? <h2 className="display-lg mt-2">{title}</h2> : null}
        {subtitle ? <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {action ? (
        <Link href={action.href} className="link-underline text-xs font-semibold tracking-wide text-[var(--accent)]">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

function Hero({ config }: { config: Record<string, any> }) {
  if (config.variant === "full") {
    return (
      <section className="shell pt-6">
        <div className="relative overflow-hidden rounded-[28px] bg-[var(--ink)]">
          {config.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.image} alt="" className="h-[62vh] min-h-[420px] w-full object-cover opacity-80" />
          ) : (
            <div className="h-[520px] w-full bg-[var(--ink)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/25 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="shell">
              <div className="max-w-xl text-white">
                {config.eyebrow ? <p className="eyebrow text-[var(--accent-soft)]">{config.eyebrow}</p> : null}
                <h1 className="display-xl mt-4">{config.title}</h1>
                {config.subtitle ? <p className="mt-5 max-w-md text-sm leading-8 text-white/75">{config.subtitle}</p> : null}
                {config.ctaLabel ? (
                  <Link href={config.ctaHref ?? "/products"} className="btn btn-accent mt-8">
                    {config.ctaLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="shell pt-6 md:pt-10">
      <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="fade-up order-2 lg:order-1">
          {config.eyebrow ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {config.eyebrow}
            </span>
          ) : null}
          <h1 className="display-xl mt-6 text-balance">{config.title}</h1>
          {config.subtitle ? <p className="lead mt-6 max-w-lg">{config.subtitle}</p> : null}
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {config.ctaLabel ? (
              <Link href={config.ctaHref ?? "/products"} className="btn btn-primary">
                {config.ctaLabel}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="rotate-180">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            ) : null}
            {config.secondaryLabel ? (
              <Link href={config.secondaryHref ?? "/about"} className="btn btn-outline">
                {config.secondaryLabel}
              </Link>
            ) : null}
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-[var(--line)] pt-6">
            {[
              { value: "۱۲+", label: "قطعه در کالکشن" },
              { value: "۷ روز", label: "مهلت بازگشت" },
              { value: "۱۰۰٪", label: "پارچه طبیعی" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-lg font-bold">{item.value}</dt>
                <dd className="mt-1 text-[11px] text-[var(--muted)]">{item.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative">
            <div className="absolute -inset-3 -z-10 rounded-[36px] border border-[var(--line)]" aria-hidden />
            <div className="overflow-hidden rounded-[28px] bg-[var(--image-bg)]">
              {config.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={config.image} alt={config.title ?? ""} className="h-[380px] w-full object-cover md:h-[560px]" />
              ) : (
                <div className="h-[420px] w-full bg-[var(--image-bg)]" />
              )}
            </div>
            <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 backdrop-blur">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)]/40 text-[var(--accent-strong)]">
                ✦
              </span>
              <div>
                <p className="text-[11px] font-semibold">تولید محدود</p>
                <p className="text-[10px] text-[var(--muted)]">هر قطعه در تیراژ کم</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturedCategories({ config }: { config: Record<string, any> }) {
  return <FeaturedCategoriesAsync config={config} />;
}

async function FeaturedCategoriesAsync({ config }: { config: Record<string, any> }) {
  const categories = await fetchCategories(Number(config.limit ?? 3));
  if (!categories.length) return null;
  return (
    <section className="shell section">
      <SectionHeading
        eyebrow={config.eyebrow}
        title={config.title ?? "دسته‌بندی‌ها"}
        subtitle={config.subtitle}
        action={config.ctaLabel ? { label: config.ctaLabel, href: config.ctaHref ?? "/products" } : undefined}
      />
      <div className="grid gap-4 md:grid-cols-3">
        {categories.map((category, index) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className={`group relative overflow-hidden rounded-3xl bg-[var(--image-bg)] ${index === 0 ? "md:row-span-1" : ""}`}
          >
            <div className="aspect-[4/5] md:aspect-[3/4]">
              {category.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={category.imageUrl}
                  alt={category.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">{category.name}</div>
              )}
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent p-6 pt-16 text-white">
              <p className="text-lg font-bold">{category.name}</p>
              <p className="mt-1 text-[11px] text-white/70">مشاهده کالکشن</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

async function ProductSection({
  config,
  fallbackTitle,
  defaultSort,
  layout = "grid",
}: {
  config: Record<string, any>;
  fallbackTitle?: string;
  defaultSort?: string;
  layout?: "grid" | "rail";
}) {
  const products = await fetchProducts(config, defaultSort);
  if (!products.length) return null;
  const columns = (config.columns as 2 | 3 | 4) ?? 4;
  return (
    <section className="shell section">
      <SectionHeading
        eyebrow={config.eyebrow}
        title={config.title ?? fallbackTitle}
        subtitle={config.subtitle}
        action={{ label: "مشاهده همه", href: config.ctaHref ?? "/products" }}
      />
      {layout === "rail" ? <ProductRail products={products} /> : <ProductGrid products={products} columns={columns} />}
    </section>
  );
}

function PromoBanner({ config }: { config: Record<string, any> }) {
  return (
    <section className="shell section">
      <div className="relative overflow-hidden rounded-[32px] bg-[var(--ink)] text-white">
        <div className="grid md:grid-cols-2">
          <div className="relative z-10 p-8 md:p-14">
            {config.eyebrow ? <p className="eyebrow text-[var(--accent-soft)]">{config.eyebrow}</p> : null}
            <h2 className="display-lg mt-4 max-w-sm">{config.title}</h2>
            {config.subtitle ? <p className="mt-4 max-w-sm text-sm leading-7 text-white/65">{config.subtitle}</p> : null}
            {config.ctaLabel ? (
              <Link href={config.ctaHref ?? "/products"} className="btn btn-accent mt-8">
                {config.ctaLabel}
              </Link>
            ) : null}
          </div>
          {config.image ? (
            <div className="relative min-h-[240px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={config.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[var(--ink)]/40 to-[var(--ink)]" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ImageText({ config }: { config: Record<string, any> }) {
  const imageFirst = config.align !== "image-right";
  return (
    <section className="shell section">
      <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
        <div className={`overflow-hidden rounded-[28px] bg-[var(--image-bg)] ${imageFirst ? "" : "md:order-2"}`}>
          {config.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.image} alt={config.title ?? ""} className="h-[320px] w-full object-cover md:h-[440px]" />
          ) : null}
        </div>
        <div className={imageFirst ? "" : "md:order-1"}>
          {config.eyebrow ? <p className="eyebrow">{config.eyebrow}</p> : null}
          <h2 className="display-lg mt-3">{config.title}</h2>
          {config.body ? <p className="mt-5 text-sm leading-8 text-[var(--muted)]">{config.body}</p> : null}
          {config.ctaLabel ? (
            <Link href={config.ctaHref ?? "/about"} className="btn btn-outline mt-7">
              {config.ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ config }: { config: Record<string, any> }) {
  const items: { name: string; role?: string; quote: string }[] = config.items ?? [];
  if (!items.length) return null;
  return (
    <section className="shell section">
      <SectionHeading eyebrow={config.eyebrow} title={config.title ?? "از زبان مشتریان"} subtitle={config.subtitle} />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <figure key={item.name} className="card p-7">
            <div className="text-[var(--accent)]" aria-hidden>
              ★★★★★
            </div>
            <blockquote className="mt-4 text-sm leading-8 text-[var(--foreground)]/90">«{item.quote}»</blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-[var(--line)] pt-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)]/30 text-xs font-bold text-[var(--accent-strong)]">
                {item.name.slice(0, 1)}
              </span>
              <div>
                <p className="text-xs font-semibold">{item.name}</p>
                {item.role ? <p className="text-[11px] text-[var(--muted)]">{item.role}</p> : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Faq({ config }: { config: Record<string, any> }) {
  const items: { question: string; answer: string }[] = config.items ?? [];
  if (!items.length) return null;
  return (
    <section className="shell section">
      <div className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div>
          <p className="eyebrow">پشتیبانی</p>
          <h2 className="display-lg mt-3">{config.title ?? "سؤالات پرتکرار"}</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            پاسخ سؤال خود را پیدا نکردید؟ تیم پشتیبانی هر روز ۹ تا ۲۱ پاسخگوی شماست.
          </p>
        </div>
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                {item.question}
                <span className="text-[var(--accent)] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-[13px] leading-7 text-[var(--muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureStrip({ config }: { config: Record<string, any> }) {
  const items: { label: string; value?: string }[] = config.items ?? [
    { label: "ارسال رایگان", value: "بالای ۵ میلیون" },
    { label: "۷ روز مهلت بازگشت", value: "بدون قید و شرط" },
    { label: "پرداخت امن", value: "درگاه معتبر" },
    { label: "پشتیبانی انسانی", value: "۹ تا ۲۱" },
  ];
  return (
    <section className="shell">
      <div className="grid gap-4 rounded-3xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]/25 text-[var(--accent-strong)]">
              ✦
            </span>
            <div>
              <p className="text-[12.5px] font-semibold">{item.label}</p>
              {item.value ? <p className="text-[11px] text-[var(--muted)]">{item.value}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageSlider({ config }: { config: Record<string, any> }) {
  const slides: { image: string; title?: string; href?: string }[] = config.items ?? [];
  if (!slides.length) return null;
  return (
    <section className="section">
      <div className="shell">
        <SectionHeading eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} />
      </div>
      <div className="scroll-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 md:px-10">
        {slides.map((slide, index) => (
          <Link
            key={`${slide.image}-${index}`}
            href={slide.href ?? "/products"}
            className="relative w-[78%] shrink-0 snap-center overflow-hidden rounded-3xl bg-[var(--image-bg)] sm:w-[46%] lg:w-[32%]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.image} alt={slide.title ?? ""} className="h-[420px] w-full object-cover" />
            {slide.title ? (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-14 text-sm font-semibold text-white">
                {slide.title}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

function RichText({ config }: { config: Record<string, any> }) {
  return (
    <section className="shell section">
      <div className="mx-auto max-w-2xl">
        {config.eyebrow ? <p className="eyebrow">{config.eyebrow}</p> : null}
        {config.title ? <h2 className="display-lg mt-3">{config.title}</h2> : null}
        <div className="mt-6 space-y-4 whitespace-pre-wrap text-[14.5px] leading-9 text-[var(--foreground)]/85">
          {config.body ?? config.text ?? ""}
        </div>
      </div>
    </section>
  );
}

function VideoSection({ config }: { config: Record<string, any> }) {
  return (
    <section className="shell section">
      <div className="relative overflow-hidden rounded-[28px] bg-[var(--ink)]">
        {config.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.image} alt="" className="h-[420px] w-full object-cover opacity-70" />
        ) : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center text-white">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 7l9 5-9 5V7z" />
            </svg>
          </span>
          <p className="text-lg font-semibold">{config.title ?? "پشت صحنه کالکشن"}</p>
          {config.subtitle ? <p className="max-w-sm text-xs text-white/60">{config.subtitle}</p> : null}
        </div>
      </div>
    </section>
  );
}

export async function PageRenderer({ sections }: { sections: Section[] }) {
  const visible = sections.filter((section) => section.isVisible !== false);
  const rendered = await Promise.all(
    visible.map(async (section) => {
      const config = section.config ?? {};
      switch (section.type) {
        case "hero":
        case "hero_banner":
          return <Hero key={section.id} config={config} />;
        case "feature_strip":
        case "usp":
          return <FeatureStrip key={section.id} config={config} />;
        case "featured_categories":
        case "categories":
          return <FeaturedCategories key={section.id} config={config} />;
        case "product_grid":
          return <ProductSection key={section.id} config={config} fallbackTitle="محصولات منتخب" />;
        case "product_carousel":
          return <ProductSection key={section.id} config={config} fallbackTitle="پیشنهاد ما" layout="rail" />;
        case "best_sellers":
          return <ProductSection key={section.id} config={config} fallbackTitle="پرفروش‌ها" defaultSort="best" />;
        case "new_arrivals":
          return <ProductSection key={section.id} config={config} fallbackTitle="جدیدترین‌ها" defaultSort="newest" />;
        case "promo_banner":
        case "promotional_banner":
          return <PromoBanner key={section.id} config={config} />;
        case "image_text":
          return <ImageText key={section.id} config={config} />;
        case "testimonials":
          return <Testimonials key={section.id} config={config} />;
        case "faq":
          return <Faq key={section.id} config={config} />;
        case "newsletter":
          return (
            <section key={section.id} className="shell section">
              <div className="rounded-[32px] bg-[var(--ink)] px-6 py-14 text-center text-white">
                <p className="eyebrow text-[var(--accent-soft)]">خبرنامه</p>
                <h2 className="display-lg mt-3">{config.title ?? "اولین نفر باش"}</h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-white/60">
                  {config.subtitle ?? "از کالکشن‌های محدود و تخفیف‌های ویژه باخبر شو."}
                </p>
                <div className="mt-7">
                  <Newsletter title={config.title} subtitle={config.subtitle} />
                </div>
              </div>
            </section>
          );
        case "countdown":
          return <Countdown key={section.id} config={config} />;
        case "rich_text":
          return <RichText key={section.id} config={config} />;
        case "image_slider":
        case "slider":
          return <ImageSlider key={section.id} config={config} />;
        case "video":
          return <VideoSection key={section.id} config={config} />;
        case "brand_carousel": {
          const brands: string[] = config.items?.map((item: any) => item.label ?? item.name) ?? ["AGHACI", "Noor", "Atelier"];
          return (
            <section key={section.id} className="shell section">
              <div className="marquee-track gap-14 text-[var(--muted)]">
                {[...brands, ...brands].map((brand, index) => (
                  <span key={`${brand}-${index}`} className="text-lg font-semibold tracking-[0.25em]">
                    {brand}
                  </span>
                ))}
              </div>
            </section>
          );
        }
        default:
          return null;
      }
    }),
  );

  return <div className="pb-4">{rendered}</div>;
}

export { ProductSection };
