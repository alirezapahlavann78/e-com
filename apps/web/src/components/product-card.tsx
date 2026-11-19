import Link from "next/link";

import { formatPrice } from "../lib/format";
import { QuickAdd } from "./quick-add";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  basePrice: string | number | null;
  compareAtPrice?: string | number | null;
  images?: { url: string; alt?: string | null }[];
  variants?: { id: string; title: string | null; stockQuantity: number }[];
  createdAt?: string;
};

const NEW_WINDOW_DAYS = 21;

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const images = product.images ?? [];
  const primary = images[0]?.url;
  const secondary = images[1]?.url;
  const price = product.basePrice != null ? Number(product.basePrice) : null;
  const compare = product.compareAtPrice != null ? Number(product.compareAtPrice) : null;
  const onSale = compare != null && price != null && compare > price;
  const isNew = product.createdAt
    ? Date.now() - new Date(product.createdAt).getTime() < NEW_WINDOW_DAYS * 86_400_000
    : false;
  const discount = onSale && compare ? Math.round(((compare - price!) / compare) * 100) : 0;
  const firstVariant = product.variants?.find((variant) => variant.stockQuantity > 0) ?? product.variants?.[0];

  return (
    <article className="product-card group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="product-media rounded-2xl">
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primary}
              alt={images[0]?.alt ?? product.name}
              loading={priority ? "eager" : "lazy"}
              className="primary"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs tracking-[0.3em] text-[var(--muted)]">آگاهی</div>
          )}
          {secondary ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={secondary} alt="" loading="lazy" className="secondary" />
          ) : null}

          <div className="absolute right-3 top-3 flex flex-col items-start gap-1.5">
            {onSale ? (
              <span className="badge bg-[var(--accent)] text-white">{discount.toLocaleString("fa-IR")}٪ تخفیف</span>
            ) : null}
            {isNew && !onSale ? <span className="badge bg-white/90 text-[var(--ink)]">تازه</span> : null}
          </div>
        </div>
      </Link>

      <div className="mt-3.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {product.brand ? <p className="text-[11px] tracking-wide text-[var(--muted)]">{product.brand}</p> : null}
          <Link href={`/products/${product.slug}`} className="mt-0.5 block truncate text-[13.5px] font-medium">
            {product.name}
          </Link>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className={`text-[13px] font-semibold ${onSale ? "text-[var(--accent-strong)]" : ""}`}>
              {formatPrice(product.basePrice)}
            </span>
            {onSale ? (
              <span className="text-[11px] text-[var(--muted)] line-through">{formatPrice(product.compareAtPrice)}</span>
            ) : null}
          </div>
        </div>
        <QuickAdd
          productId={product.id}
          variantId={firstVariant?.id}
          hasVariants={(product.variants?.length ?? 0) > 1}
          slug={product.slug}
        />
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  columns = 4,
}: {
  products: ProductCardData[];
  columns?: 2 | 3 | 4;
}) {
  const grid =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";
  return (
    <div className={`grid gap-x-4 gap-y-9 md:gap-x-6 ${grid}`}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}

export function ProductRail({ products }: { products: ProductCardData[] }) {
  return (
    <div className="scroll-hide -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
      {products.map((product) => (
        <div key={product.id} className="w-[62%] shrink-0 snap-start sm:w-[38%] lg:w-[24%]">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
