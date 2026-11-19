"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatPrice } from "../lib/format";

export type CompareItem = {
  id: string;
  slug: string;
  name: string;
  brand?: string | null;
  image?: string | null;
  price?: number | null;
};

const KEY = "compare_products";
const EVENT = "compare-changed";
export const COMPARE_LIMIT = 3;

function read(): CompareItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CompareItem => Boolean(item && typeof item.id === "string" && typeof item.slug === "string"))
      .slice(0, COMPARE_LIMIT);
  } catch {
    return [];
  }
}

function write(items: CompareItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, COMPARE_LIMIT)));
  window.dispatchEvent(new Event(EVENT));
}

export function useCompare() {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setItems(read());
      setReady(true);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    items,
    ready,
    has: (id: string) => items.some((item) => item.id === id),
    toggle(item: CompareItem) {
      const current = read();
      const exists = current.some((entry) => entry.id === item.id);
      if (exists) {
        write(current.filter((entry) => entry.id !== item.id));
        return;
      }
      write([...current, item].slice(-COMPARE_LIMIT));
    },
    remove(id: string) {
      write(read().filter((entry) => entry.id !== id));
    },
    clear() {
      write([]);
    },
  };
}

export function CompareButton({ item, label = "مقایسه" }: { item: CompareItem; label?: string }) {
  const { has, toggle, items } = useCompare();
  const active = has(item.id);
  const full = !active && items.length >= COMPARE_LIMIT;

  return (
    <button
      type="button"
      onClick={() => toggle(item)}
      disabled={full}
      aria-pressed={active}
      title={full ? "حداکثر ۳ محصول را می‌توان مقایسه کرد" : active ? "حذف از مقایسه" : "افزودن به مقایسه"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] transition ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--line)] bg-white/80 text-[var(--muted)] hover:border-[var(--ink)] hover:text-[var(--foreground)]"
      } ${full ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h10M4 12h7M4 18h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M17 4v16M17 12l4-4M17 12l-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

export function CompareBar() {
  const { items, remove, clear, ready } = useCompare();
  if (!ready || !items.length) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--background)]/95 backdrop-blur">
      <div className="shell flex flex-wrap items-center gap-x-5 gap-y-3 py-3">
        <p className="text-[11px] font-semibold">
          مقایسه <span className="text-[var(--muted)]">({items.length.toLocaleString("fa-IR")} از ۳)</span>
        </p>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {items.map((item) => (
            <span key={item.id} className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] py-1 pe-2 ps-1">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="h-6 w-6 rounded-full bg-[var(--image-bg)]" />
              )}
              <span className="max-w-[9rem] truncate text-[11px]">{item.name}</span>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`حذف ${item.name} از مقایسه`}
                className="text-[var(--muted)] hover:text-[var(--danger)]"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={clear} className="text-[11px] text-[var(--muted)] hover:text-[var(--danger)]">
            پاک‌کردن
          </button>
          <Link href="/compare" className="btn btn-primary px-5 py-2 text-xs">
            مقایسه محصولات
          </Link>
        </div>
      </div>
    </div>
  );
}

export type CompareProduct = {
  id: string;
  slug: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  basePrice?: string | number | null;
  compareAtPrice?: string | number | null;
  stockQuantity?: number;
  images?: { url: string; alt?: string | null }[];
  variants?: {
    id: string;
    title: string | null;
    stockQuantity: number;
    attributes?: { attributeValue: { value: string; attribute: { slug: string } } }[];
  }[];
};

export function compareSpecs(product: CompareProduct) {
  const price = product.basePrice != null ? Number(product.basePrice) : null;
  const compare = product.compareAtPrice != null ? Number(product.compareAtPrice) : null;
  const onSale = compare != null && price != null && compare > price;
  const variants = product.variants ?? [];
  const colours = new Set<string>();
  const sizes = new Set<string>();
  for (const variant of variants) {
    for (const link of variant.attributes ?? []) {
      if (link.attributeValue.attribute.slug === "color") colours.add(link.attributeValue.value);
      if (link.attributeValue.attribute.slug === "size") sizes.add(link.attributeValue.value);
    }
  }
  const stock = variants.length
    ? variants.reduce((sum, variant) => sum + (variant.stockQuantity ?? 0), 0)
    : (product.stockQuantity ?? 0);
  return {
    price,
    compare,
    onSale,
    discount: onSale && compare ? Math.round(((compare - price!) / compare) * 100) : 0,
    colours: [...colours],
    sizes: [...sizes],
    stock,
    inStock: stock > 0,
    hasVariants: variants.length > 1,
  };
}

export function comparePriceLabel(product: CompareProduct) {
  return formatPrice(product.basePrice);
}
