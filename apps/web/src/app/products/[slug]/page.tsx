import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { api } from "../../../lib/api";
import { ProductCard, type ProductCardData } from "../../../components/product-card";
import { ProductPurchase, type PurchaseProduct } from "./product-purchase";
import { ProductReviews, WishlistButton } from "./reviews-wishlist";

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
      openGraph: {
        title: product.name,
        images: product.images?.[0]?.url ? [product.images[0].url] : undefined,
      },
    };
  } catch {
    return { title: "محصول" };
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await api<Product>(`/catalog/products/${encodeURIComponent(slug)}`).catch(() => null);
  if (!product) notFound();

  const [reviews, related] = await Promise.all([
    api<Reviews>(`/reviews/product/${encodeURIComponent(slug)}`).catch(() => null),
    Promise.resolve((product.relationsFrom ?? []).filter((relation) => relation.type === "RELATED").map((relation) => relation.toProduct)),
  ]);

  return (
    <div className="shell pb-16 pt-6">
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
    </div>
  );
}
