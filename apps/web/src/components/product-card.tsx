import Link from "next/link";
import { formatPrice } from "../lib/format";

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  basePrice: string | number | null;
  compareAtPrice?: string | number | null;
  images?: { url: string; alt?: string | null }[];
};

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const img = product.images?.[0];
  const compare = product.compareAtPrice != null ? Number(product.compareAtPrice) : null;
  const price = product.basePrice != null ? Number(product.basePrice) : null;
  const onSale = compare != null && price != null && compare > price;
  return (
    <Link href={`/products/${product.slug}`} className="card-hover group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#efe9df]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.url} alt={img.alt ?? product.name} loading={priority ? "eager" : "lazy"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">AGHACI</div>
        )}
        {onSale && (
          <span className="absolute top-3 right-3 rounded-full bg-[var(--accent)] px-3 py-1 text-xs text-white">تخفیف</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-medium">{product.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-semibold text-[var(--accent)]">{formatPrice(product.basePrice)}</span>
          {onSale && <span className="text-xs text-[var(--muted)] line-through">{formatPrice(product.compareAtPrice)}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, columns = 3 }: { products: ProductCardData[]; columns?: 2 | 3 | 4 }) {
  const cols = columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-5 ${cols}`}>
      {products.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 3} />)}
    </div>
  );
}
