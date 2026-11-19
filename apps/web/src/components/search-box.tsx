"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "./cart-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type Result = { products: { id: string; name: string; slug: string; basePrice: string | null }[]; categories: { id: string; name: string; slug: string }[] };

export function SearchBox() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result>({ products: [], categories: [] });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResult({ products: [], categories: [] }); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/catalog/search/autocomplete?q=${encodeURIComponent(q)}&limit=6`);
        if (res.ok) setResult(await res.json());
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const hasResults = result.products.length > 0 || result.categories.length > 0;

  return (
    <div ref={boxRef} className="relative">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="جستجوی محصولات…"
        className="w-40 rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-sm transition-all duration-300 focus:w-56 md:w-52 md:focus:w-72"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-xl">
          {hasResults ? (
            <div className="max-h-96 overflow-auto p-2">
              {result.categories.length > 0 && (
                <p className="px-3 py-2 text-xs text-[var(--muted)]">دسته‌بندی‌ها</p>
              )}
              {result.categories.map((c) => (
                <Link key={c.id} href={`/categories/${c.slug}`} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-[var(--background)]">{c.name}</Link>
              ))}
              {result.products.length > 0 && (
                <p className="px-3 py-2 text-xs text-[var(--muted)]">محصولات</p>
              )}
              {result.products.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-[var(--background)]">
                  <span>{p.name}</span>
                  {p.basePrice && <span className="text-xs text-[var(--muted)]">{Number(p.basePrice).toLocaleString("fa-IR")} تومان</span>}
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">نتیجه‌ای یافت نشد</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MiniCart() {
  const cart = useCart();
  const count = cart?.items?.length ?? 0;
  return (
    <Link href="/cart" className="relative flex h-10 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 text-sm transition hover:border-[var(--accent)]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 7V6a6 6 0 1 1 12 0v1m-14 0h16l-1.2 12.1a2 2 0 0 1-2 1.9H9.2a2 2 0 0 1-2-1.9L6 7Z"/></svg>
      <span className="hidden md:inline">سبد خرید</span>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-xs font-medium text-white">{count.toLocaleString("fa-IR")}</span>
      )}
    </Link>
  );
}
