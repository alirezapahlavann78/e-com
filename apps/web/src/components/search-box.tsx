"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatPrice } from "../lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type Result = {
  products: { id: string; name: string; slug: string; basePrice: string | null; images?: { url: string }[] }[];
  categories: { id: string; name: string; slug: string }[];
};

export function SearchBox() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Result>({ products: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResult({ products: [], categories: [] });
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/catalog/search/autocomplete?q=${encodeURIComponent(q)}&limit=6`);
        if (res.ok) setResult(await res.json());
      } catch {
        /* offline */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const hasResults = result.products.length > 0 || result.categories.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-label="جستجو"
        onClick={() => {
          setOpen((value) => !value);
          setTimeout(() => inputRef.current?.focus(), 60);
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)] transition hover:border-[var(--accent)]"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-4-4" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-x-0 top-0 z-[60] bg-[var(--background)]/95 backdrop-blur-xl md:absolute md:inset-auto md:left-0 md:top-12 md:w-[420px] md:rounded-3xl md:border md:border-[var(--line)] md:bg-[var(--panel)] md:shadow-2xl">
          <div className="shell flex items-center gap-3 py-4 md:px-4 md:py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="shrink-0 text-[var(--muted)]">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="جستجو در محصولات و دسته‌بندی‌ها…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            />
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--muted)] md:hidden">
              بستن
            </button>
          </div>

          <div className="max-h-[60vh] overflow-auto border-t border-[var(--line)] p-2 md:max-h-96">
            {q.trim().length < 2 ? (
              <div className="px-3 py-4 text-xs text-[var(--muted)]">
                <p className="mb-2 font-semibold text-[var(--foreground)]">جستجوهای پیشنهادی</p>
                <div className="flex flex-wrap gap-2">
                  {["پالتو", "کشمیر", "پیراهن ابریشم", "کیف چرمی", "بوت"].map((term) => (
                    <button key={term} type="button" className="chip" onClick={() => setQ(term)}>
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            ) : loading ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--muted)]">در حال جستجو…</p>
            ) : hasResults ? (
              <>
                {result.categories.length > 0 ? (
                  <div className="mb-2">
                    <p className="px-3 py-2 text-[11px] text-[var(--muted)]">دسته‌بندی‌ها</p>
                    {result.categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-[var(--background)]"
                      >
                        <span>{category.name}</span>
                        <span className="text-[11px] text-[var(--muted)]">دسته‌بندی</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
                {result.products.length > 0 ? (
                  <div>
                    <p className="px-3 py-2 text-[11px] text-[var(--muted)]">محصولات</p>
                    {result.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--background)]"
                      >
                        <span className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--image-bg)]">
                          {product.images?.[0] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={product.images[0].url} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </span>
                        <span className="flex-1 text-sm">{product.name}</span>
                        <span className="text-[11px] text-[var(--muted)]">{formatPrice(product.basePrice)}</span>
                      </Link>
                    ))}
                    <Link
                      href={`/products?q=${encodeURIComponent(q)}`}
                      onClick={() => setOpen(false)}
                      className="mt-1 block rounded-xl px-3 py-2 text-center text-xs font-semibold text-[var(--accent)] hover:bg-[var(--background)]"
                    >
                      مشاهده همه نتایج
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="px-3 py-6 text-center text-sm text-[var(--muted)]">نتیجه‌ای یافت نشد</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
