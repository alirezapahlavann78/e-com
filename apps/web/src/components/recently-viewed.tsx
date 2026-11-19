"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatPrice } from "../lib/format";
import type { CompareItem } from "./compare-store";

export type RecentItem = CompareItem & { viewedAt: number };

const KEY = "recently_viewed";
const EVENT = "recent-viewed-changed";
export const RECENT_LIMIT = 8;

function read(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is RecentItem => Boolean(item && typeof item.slug === "string"));
  } catch {
    return [];
  }
}

/** Records the current product in the "recently viewed" list (localStorage). */
export function TrackRecentlyViewed({ item }: { item: CompareItem }) {
  useEffect(() => {
    const previous = read().filter((entry) => entry.slug !== item.slug);
    const next: RecentItem[] = [{ ...item, viewedAt: Date.now() }, ...previous].slice(0, RECENT_LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }, [item.slug, item.id, item.name, item.image, item.price, item.brand]);
  return null;
}

export function RecentlyViewedRail({ excludeSlug, title = "اخیراً دیده‌اید" }: { excludeSlug?: string; title?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const sync = () => setItems(read().filter((item) => item.slug !== excludeSlug));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [excludeSlug]);

  if (!items.length) return null;

  return (
    <section className="mt-20">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">تاریخچه</p>
          <h2 className="display-lg mt-2">{title}</h2>
        </div>
        <Link href="/products" className="link-underline text-xs font-semibold text-[var(--accent)]">
          همه محصولات
        </Link>
      </div>
      <div className="scroll-hide -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:px-0">
        {items.slice(0, 6).map((item) => (
          <Link
            key={item.slug}
            href={`/products/${item.slug}`}
            className="w-[46%] shrink-0 snap-start sm:w-[30%] lg:w-[16%]"
          >
            <div className="overflow-hidden rounded-2xl bg-[#ece4d6]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} loading="lazy" className="aspect-[3/4] w-full object-cover transition duration-500 hover:scale-[1.03]" />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center text-[10px] tracking-[0.3em] text-[var(--muted)]">آگاهی</div>
              )}
            </div>
            <p className="mt-2 truncate text-[12.5px] font-medium">{item.name}</p>
            <p className="mt-0.5 text-[11.5px] text-[var(--muted)]">{formatPrice(item.price ?? null)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
