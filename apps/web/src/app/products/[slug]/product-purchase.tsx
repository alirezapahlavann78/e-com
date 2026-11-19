"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { addToCart } from "../../../components/cart-store";
import { formatPrice } from "../../../lib/format";

type Variant = {
  id: string;
  title?: string | null;
  sku: string;
  price: string | number | null;
  stockQuantity: number;
  attributes?: { attributeValue: { value: string; attribute: { name: string } } }[];
};

export type PurchaseProduct = {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  basePrice: string | number | null;
  compareAtPrice?: string | number | null;
  images: { url: string; alt?: string | null }[];
  variants: Variant[];
  description?: string | null;
  shortDescription?: string | null;
  sku?: string | null;
  categories?: { category: { name: string; slug: string } }[];
};

export function ProductPurchase({ product, rating }: { product: PurchaseProduct; rating?: { average: number; count: number } }) {
  const [activeImage, setActiveImage] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(
    product.variants.find((variant) => variant.stockQuantity > 0)?.id ?? product.variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const variant = useMemo(() => product.variants.find((item) => item.id === variantId) ?? null, [product.variants, variantId]);
  const price = Number(variant?.price ?? product.basePrice ?? 0);
  const compare = product.compareAtPrice != null ? Number(product.compareAtPrice) : null;
  const onSale = compare != null && compare > price;
  const stock = variant ? variant.stockQuantity : product.variants.length ? 0 : 99;
  const inStock = stock > 0;
  const gallery = product.images.length ? product.images : [{ url: "", alt: product.name }];

  async function submit() {
    setStatus("loading");
    setError("");
    try {
      await addToCart(product.id, variant?.id ?? null, quantity);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "افزودن به سبد ناموفق بود");
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      {/* Gallery */}
      <div>
        <div className="relative overflow-hidden rounded-[28px] bg-[var(--image-bg)]">
          {gallery[activeImage]?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gallery[activeImage].url}
              alt={gallery[activeImage].alt ?? product.name}
              className="aspect-[4/5] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center text-sm tracking-[0.3em] text-[var(--muted)]">آگاهی</div>
          )}
          {onSale ? (
            <span className="absolute right-4 top-4 badge bg-[var(--accent)] text-white">
              {Math.round(((compare! - price) / compare!) * 100).toLocaleString("fa-IR")}٪ تخفیف
            </span>
          ) : null}
        </div>
        {gallery.length > 1 ? (
          <div className="mt-3 grid grid-cols-4 gap-3">
            {gallery.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                className={`overflow-hidden rounded-xl border-2 transition ${
                  index === activeImage ? "border-[var(--ink)]" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Info */}
      <div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
          {product.categories?.[0] ? (
            <Link href={`/categories/${product.categories[0].category.slug}`} className="hover:text-[var(--foreground)]">
              {product.categories[0].category.name}
            </Link>
          ) : null}
          {product.brand ? <span className="text-[var(--accent)]">{product.brand}</span> : null}
        </div>

        <h1 className="mt-3 text-3xl font-bold leading-snug md:text-4xl">{product.name}</h1>

        {rating && rating.count > 0 ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
            <span className="text-[var(--accent)]">{"★".repeat(Math.round(rating.average))}</span>
            <span>{rating.average.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</span>
            <span>({rating.count.toLocaleString("fa-IR")} نظر)</span>
          </div>
        ) : null}

        {product.shortDescription ? (
          <p className="mt-5 text-sm leading-8 text-[var(--muted)]">{product.shortDescription}</p>
        ) : null}

        <div className="mt-7 flex items-baseline gap-3">
          <span className="text-2xl font-bold">{formatPrice(price)}</span>
          {onSale ? <span className="text-sm text-[var(--muted)] line-through">{formatPrice(compare)}</span> : null}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px]">
          <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-[var(--success)]" : "bg-[var(--danger)]"}`} />
          <span className={inStock ? "text-[var(--success)]" : "text-[var(--danger)]"}>
            {inStock ? `موجود در انبار${stock <= 5 ? ` — تنها ${stock.toLocaleString("fa-IR")} عدد` : ""}` : "ناموجود"}
          </span>
          {product.sku ? <span className="text-[var(--muted)]">کد: {product.sku}</span> : null}
        </div>

        {product.variants.length > 1 ? (
          <div className="mt-7">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold">انتخاب سایز</p>
              <span className="text-[11px] text-[var(--muted)]">راهنمای سایز</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((item) => {
                const disabled = item.stockQuantity <= 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setVariantId(item.id)}
                    className={`min-w-[52px] rounded-xl border px-4 py-2.5 text-xs transition ${
                      item.id === variantId
                        ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                        : "border-[var(--line)] hover:border-[var(--ink)]"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {item.title ?? item.sku}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center rounded-full border border-[var(--line)]">
            <button
              type="button"
              aria-label="کاهش"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="h-12 w-11 text-lg text-[var(--muted)]"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold">{quantity.toLocaleString("fa-IR")}</span>
            <button
              type="button"
              aria-label="افزایش"
              onClick={() => setQuantity((value) => Math.min(10, value + 1))}
              className="h-12 w-11 text-lg text-[var(--muted)]"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={!inStock || status === "loading"}
            className="btn btn-primary h-12 flex-1 px-8"
          >
            {status === "loading" ? "در حال افزودن…" : status === "done" ? "به سبد اضافه شد ✓" : "افزودن به سبد خرید"}
          </button>

          <Link href="/cart" className="btn btn-outline h-12 px-6">
            سبد خرید
          </Link>
        </div>
        {error ? <p className="mt-3 text-xs text-[var(--danger)]">{error}</p> : null}

        <div className="mt-8 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 text-[11px] text-[var(--muted)] sm:grid-cols-3">
          <span>✦ ارسال ۲۴–۴۸ ساعته</span>
          <span>✦ ۷ روز مهلت بازگشت</span>
          <span>✦ بسته‌بندی هدیه</span>
        </div>

        <div className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
          <details open className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              توضیحات محصول
              <span className="text-[var(--accent)] transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-8 text-[var(--muted)]">{product.description}</p>
          </details>
          <details className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              مشخصات
              <span className="text-[var(--accent)] transition group-open:rotate-45">+</span>
            </summary>
            <dl className="mt-3 space-y-2 text-[13px] text-[var(--muted)]">
              <div className="flex justify-between">
                <dt>برند</dt>
                <dd>{product.brand ?? "آگاهی"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>کد محصول</dt>
                <dd dir="ltr">{product.sku ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>جنس</dt>
                <dd>پارچه طبیعی</dd>
              </div>
              <div className="flex justify-between">
                <dt>شست‌وشو</dt>
                <dd>شست‌وشوی خشک توصیه می‌شود</dd>
              </div>
            </dl>
          </details>
          <details className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              ارسال و بازگشت
              <span className="text-[var(--accent)] transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-[13px] leading-8 text-[var(--muted)]">
              سفارش‌های تهران ۲۴ تا ۴۸ ساعت و سایر شهرها ۲ تا ۴ روز کاری ارسال می‌شوند. تا ۷ روز پس از دریافت، در صورت
              نداشتن برچسب، امکان تعویض سایز یا بازگشت وجود دارد.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
