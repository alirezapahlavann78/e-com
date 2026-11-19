"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { guestFetch } from "../../components/cart-store";
import { CompareButton, compareSpecs, useCompare, type CompareProduct } from "../../components/compare-store";
import { QuickAdd } from "../../components/quick-add";
import { formatPrice } from "../../lib/format";

const ROWS: { label: string; render: (product: CompareProduct) => React.ReactNode }[] = [
  {
    label: "قیمت",
    render: (product) => {
      const specs = compareSpecs(product);
      return (
        <div>
          <p className={`text-sm font-semibold ${specs.onSale ? "text-[var(--accent-strong)]" : ""}`}>{formatPrice(product.basePrice)}</p>
          {specs.onSale ? (
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              <span className="line-through">{formatPrice(product.compareAtPrice)}</span>
              <span className="ms-2 text-[var(--accent-strong)]">{specs.discount.toLocaleString("fa-IR")}٪ تخفیف</span>
            </p>
          ) : null}
        </div>
      );
    },
  },
  { label: "برند", render: (product) => <span className="text-[13px]">{product.brand ?? "—"}</span> },
  {
    label: "موجودی",
    render: (product) => {
      const specs = compareSpecs(product);
      return (
        <span className={`text-[13px] ${specs.inStock ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
          {specs.inStock ? `موجود (${specs.stock.toLocaleString("fa-IR")} عدد)` : "ناموجود"}
        </span>
      );
    },
  },
  {
    label: "رنگ‌ها",
    render: (product) => {
      const specs = compareSpecs(product);
      return specs.colours.length ? (
        <div className="flex flex-wrap gap-1.5">
          {specs.colours.map((colour) => (
            <span key={colour} className="rounded-full bg-[var(--accent-soft)]/25 px-2.5 py-1 text-[11px]">
              {colour}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-[13px] text-[var(--muted)]">—</span>
      );
    },
  },
  {
    label: "سایزها",
    render: (product) => {
      const specs = compareSpecs(product);
      return specs.sizes.length ? (
        <div className="flex flex-wrap gap-1.5">
          {specs.sizes.map((size) => (
            <span key={size} className="rounded-md border border-[var(--line)] px-2 py-0.5 text-[11px]">
              {size}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-[13px] text-[var(--muted)]">—</span>
      );
    },
  },
  {
    label: "توضیح کوتاه",
    render: (product) => <p className="text-[12.5px] leading-6 text-[var(--muted)]">{product.shortDescription ?? product.description?.slice(0, 120) ?? "—"}</p>,
  },
];

export default function ComparePage() {
  const { items, remove, clear, ready } = useCompare();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true);
    Promise.all(
      items.map((item) =>
        guestFetch<CompareProduct>(`/catalog/products/${encodeURIComponent(item.slug)}`).catch(() => null),
      ),
    ).then((rows) => {
      if (!active) return;
      setProducts(rows.filter((row): row is CompareProduct => Boolean(row)));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [items, ready]);

  return (
    <div className="shell py-10 pb-28">
      <nav className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
        <Link href="/" className="hover:text-[var(--foreground)]">خانه</Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">مقایسه محصولات</span>
      </nav>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-lg">مقایسه محصولات</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            تا ۳ محصول را کنار هم بگذارید و رنگ، سایز و موجودی را یک‌جا ببینید.
          </p>
        </div>
        {items.length ? (
          <button type="button" onClick={clear} className="text-xs font-semibold text-[var(--danger)]">
            پاک‌کردن همه
          </button>
        ) : null}
      </div>

      {!ready || loading ? (
        <p className="mt-16 text-center text-sm text-[var(--muted)]">در حال بارگذاری…</p>
      ) : !items.length ? (
        <div className="mt-14 rounded-3xl border border-dashed border-[var(--line)] px-6 py-20 text-center">
          <p className="text-sm font-semibold">هنوز محصولی برای مقایسه انتخاب نکرده‌اید</p>
          <p className="mt-2 text-xs text-[var(--muted)]">روی دکمه «مقایسه» در کارت محصولات بزنید.</p>
          <Link href="/products" className="btn btn-primary mt-6">مشاهده محصولات</Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="w-32" />
                {items.map((item) => {
                  const product = products.find((row) => row.id === item.id);
                  const specs = product ? compareSpecs(product) : null;
                  const variants = product?.variants ?? [];
                  const firstVariant = variants.find((variant) => variant.stockQuantity > 0) ?? variants[0];
                  return (
                    <th key={item.id} className="border-b border-[var(--line)] p-4 align-top">
                      <div className="text-start">
                        <Link href={`/products/${item.slug}`} className="block overflow-hidden rounded-2xl bg-[#ece4d6]">
                          {item.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.image} alt={item.name} className="aspect-[3/4] w-full object-cover" />
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center text-[10px] tracking-[0.3em] text-[var(--muted)]">آگاهی</div>
                          )}
                        </Link>
                        <p className="mt-3 text-[13px] font-semibold">{item.name}</p>
                        {specs ? (
                          <span className={`mt-2 inline-block badge ${specs.inStock ? "bg-[var(--accent-soft)]/30 text-[var(--accent-strong)]" : "bg-[#f0e2e2] text-[var(--danger)]"}`}>
                            {specs.inStock ? "موجود" : "ناموجود"}
                          </span>
                        ) : null}
                        <div className="mt-3 flex items-center gap-2">
                          {product ? (
                            <QuickAdd
                              productId={product.id}
                              variantId={firstVariant?.id}
                              hasVariants={(variants.length ?? 0) > 1}
                              slug={product.slug}
                            />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => remove(item.id)}
                            className="text-[11px] text-[var(--muted)] hover:text-[var(--danger)]"
                          >
                            حذف از مقایسه
                          </button>
                        </div>
                      </div>
                    </th>
                  );
                })}
                {items.length < 3 ? (
                  <th className="border-b border-[var(--line)] p-4 text-start align-top">
                    <Link href="/products" className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--line)] text-[11px] text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--foreground)]">
                      <span className="text-2xl">+</span>
                      افزودن محصول
                    </Link>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th className="border-b border-[var(--line)] py-4 pe-4 text-start align-top text-[11px] font-semibold text-[var(--muted)]">
                    {row.label}
                  </th>
                  {items.map((item) => {
                    const product = products.find((entry) => entry.id === item.id);
                    return (
                      <td key={item.id} className="border-b border-[var(--line)] p-4 align-top">
                        {product ? row.render(product) : <span className="text-[12px] text-[var(--muted)]">—</span>}
                      </td>
                    );
                  })}
                  {items.length < 3 ? <td className="border-b border-[var(--line)]" /> : null}
                </tr>
              ))}
              <tr>
                <th className="py-4 pe-4 text-start text-[11px] font-semibold text-[var(--muted)]">مقایسه</th>
                {items.map((item) => (
                  <td key={item.id} className="p-4">
                    <CompareButton item={item} label="حذف" />
                  </td>
                ))}
                {items.length < 3 ? <td /> : null}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
