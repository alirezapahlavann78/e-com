import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { api } from "../../../lib/api";
import { ProductCard, type ProductCardData } from "../../../components/product-card";
import { ProductPurchase, type PurchaseProduct } from "./product-purchase";
import { ProductReviews, WishlistButton } from "./reviews-wishlist";
import { RecentlyViewedRail, TrackRecentlyViewed } from "../../../components/recently-viewed";
import { JsonLd, breadcrumbJsonLd } from "../../../components/json-ld";

type Product = PurchaseProduct & {
  relationsFrom?: { type: string; toProduct: ProductCardData }[];
  seo?: { metaTitle?: string | null; metaDescription?: string | null } | null;
};

type Reviews = { items: { id: string; rating: number; title?: string | null; body: string; authorName?: string | null; isVerified: boolean; createdAt: string }[]; summary: { count: number; averageRating: number } };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await api<Product>(`/catalog/products/${encodeURIComponent(slug)}`);
    return {
      title: product.seo?.metaTitle ?? product.name,
      description: product.seo?.metaDescription ?? product.shortDescription ?? undefined,
      alternates: { canonical: `/products/${slug}` },
      openGraph: {
        title: product.name,
        description: product.shortDescription ?? undefined,
        type: "website",
        images: product.images?.[0]?.url ? [{ url: absoluteUrl(product.images[0].url), alt: product.name }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: product.name,
        images: product.images?.[0]?.url ? [absoluteUrl(product.images[0].url)] : undefined,
      },
    };
  } catch {
    return { title: "محصول" };
  }
}

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const absoluteUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`);

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await api<Product>(`/catalog/products/${encodeURIComponent(slug)}`).catch(() => null);
  if (!product) notFound();

  const [reviews, related] = await Promise.all([
    api<Reviews>(`/reviews/product/${encodeURIComponent(slug)}`).catch(() => null),
    Promise.resolve((product.relationsFrom ?? []).filter((relation) => relation.type === "RELATED").map((relation) => relation.toProduct)),
  ]);

  const price = product.basePrice != null ? Number(product.basePrice) : null;
  const stockTotal = (product.variants ?? []).reduce((sum, variant) => sum + (variant.stockQuantity ?? 0), 0);
  const category = product.categories?.[0]?.category;
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.seo?.metaDescription ?? product.shortDescription ?? product.description ?? undefined,
    sku: product.sku ?? undefined,
    image: (product.images ?? []).map((image) => absoluteUrl(image.url)),
    brand: { "@type": "Brand", name: product.brand ?? "آگاهی" },
    url: `${SITE_URL}/products/${product.slug}`,
    ...(price != null
      ? {
          offers: {
            "@type": "Offer",
            url: `${SITE_URL}/products/${product.slug}`,
            price,
            priceCurrency: "IRR",
            itemCondition: "https://schema.org/NewCondition",
            availability: stockTotal > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: "آگاهی" },
          },
        }
      : {}),
    ...(reviews && reviews.summary.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(reviews.summary.averageRating.toFixed(2)),
            reviewCount: reviews.summary.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
  const breadcrumbs = breadcrumbJsonLd([
    { name: "خانه", url: SITE_URL },
    { name: "محصولات", url: `${SITE_URL}/products` },
    ...(category ? [{ name: category.name, url: `${SITE_URL}/categories/${category.slug}` }] : []),
    { name: product.name, url: `${SITE_URL}/products/${product.slug}` },
  ]);

  return (
    <div className="shell pb-16 pt-6">
      <JsonLd data={[productJsonLd, breadcrumbs]} />
      <nav className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
        <Link href="/" className="hover:text-[var(--foreground)]">خانه</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[var(--foreground)]">محصولات</Link>
        {product.categories?.[0] ? (
          <>
            <span>/</span>
            <Link href={`/categories/${product.categories[0].category.slug}`} className="hover:text-[var(--foreground)]">
              {product.categories[0].category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <TrackRecentlyViewed
        item={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: product.brand,
          image: product.images?.[0]?.url ?? null,
          price: product.basePrice != null ? Number(product.basePrice) : null,
        }}
      />

      <div className="mt-6">
        <ProductPurchase
          product={product}
          rating={reviews ? { average: reviews.summary.averageRating, count: reviews.summary.count } : undefined}
        />
        <div className="mt-6">
          <WishlistButton productId={product.id} />
        </div>
      </div>

      {reviews && reviews.items.length > 0 ? (
        <ProductReviews slug={slug} initial={reviews} />
      ) : (
        <ProductReviews slug={slug} initial={{ items: [], summary: { count: 0, averageRating: 0 } }} />
      )}

      {related.length ? (
        <section className="mt-20">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="eyebrow">ست کردن</p>
              <h2 className="display-lg mt-2">پیشنهاد هم‌استایل</h2>
            </div>
            <Link href="/products" className="link-underline text-xs font-semibold text-[var(--accent)]">
              همه محصولات
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-6">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <RecentlyViewedRail excludeSlug={product.slug} />
    </div>
  );
}
