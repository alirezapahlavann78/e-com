"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { StoreLayout } from "./site-chrome";
import { SearchBox } from "./search-box";
import { useCart } from "./cart-store";
import { useCompare } from "./compare-store";

type Props = { layout: NonNullable<StoreLayout["header"]> };

export function HeaderClient({ layout }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cart } = useCart();
  const { items: compareItems } = useCompare();
  const count = cart?.items?.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0) ?? 0;
  const links = layout.links ?? [
    { label: "همه محصولات", href: "/products" },
    { label: "زنانه", href: "/categories/women" },
    { label: "مردانه", href: "/categories/men" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {layout.announcement ? (
        <div className="bg-[var(--ink)] text-[#e8dfd0]">
          <div className="shell flex h-9 items-center justify-center gap-3 overflow-hidden text-[11px] tracking-wide">
            <span className="text-[var(--accent-soft)]">✦</span>
            <span className="truncate">{layout.announcement}</span>
            <span className="hidden text-white/40 md:inline">|</span>
            <Link href="/products" className="hidden underline-offset-4 hover:underline md:inline">
              مشاهده کالکشن
            </Link>
          </div>
        </div>
      ) : null}

      <header
        className={`sticky top-0 z-40 border-b transition-all duration-300 ${
          scrolled ? "glass border-[var(--line)]" : "border-transparent bg-[var(--background)]"
        }`}
      >
        <div className="shell flex h-[68px] items-center gap-4">
          <button
            type="button"
            aria-label="منو"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <Link href="/" className="shrink-0">
            <span className="text-[19px] font-bold tracking-[0.22em] text-[var(--foreground)]">
              {layout.brand ?? "آگاهی"}
            </span>
            {layout.tagline ? (
              <span className="mt-0.5 hidden text-[10px] tracking-[0.12em] text-[var(--muted)] sm:block">
                {layout.tagline}
              </span>
            ) : null}
          </Link>

          <nav className="mx-2 hidden flex-1 items-center gap-7 text-[13px] text-[var(--muted)] md:flex">
            {links.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="link-underline py-2 transition hover:text-[var(--foreground)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mr-auto flex items-center gap-2 md:mr-0">
            <SearchBox />

            <Link
              href="/account"
              aria-label="حساب کاربری"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)] transition hover:border-[var(--accent)] sm:flex"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="8.5" r="3.5" />
                <path d="M4.5 20c1.5-3.5 4.3-5 7.5-5s6 1.5 7.5 5" />
              </svg>
            </Link>

            <Link
              href="/compare"
              aria-label="مقایسه محصولات"
              className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)] transition hover:border-[var(--accent)] sm:flex"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 6h9M4 12h6M4 18h9" strokeLinecap="round" />
                <path d="M17 5v14M17 12l4-4M17 12l-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {compareItems.length ? (
                <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-white">
                  {compareItems.length.toLocaleString("fa-IR")}
                </span>
              ) : null}
            </Link>

            <Link
              href="/cart"
              className="relative flex h-10 items-center gap-2 rounded-full bg-[var(--ink)] px-4 text-[13px] font-medium text-[#fbf7f0] transition hover:bg-[var(--accent-strong)]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 7V6a6 6 0 1 1 12 0v1m-14 0h16l-1.2 12.1a2 2 0 0 1-2 1.9H9.2a2 2 0 0 1-2-1.9L6 7Z" />
              </svg>
              <span className="hidden md:inline">سبد خرید</span>
              {count > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-soft)] px-1 text-[11px] font-bold text-[var(--ink)]">
                  {count.toLocaleString("fa-IR")}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col bg-[var(--background)] p-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold tracking-[0.2em]">{layout.brand ?? "آگاهی"}</span>
              <button
                type="button"
                aria-label="بستن"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)]"
              >
                ✕
              </button>
            </div>
            <nav className="mt-10 flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-base transition hover:bg-[var(--panel)]"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/products" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base hover:bg-[var(--panel)]">
                همه محصولات
              </Link>
              <Link href="/compare" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base hover:bg-[var(--panel)]">
                مقایسه محصولات
              </Link>
              <Link href="/account" onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-base hover:bg-[var(--panel)]">
                حساب من
              </Link>
            </nav>
            <div className="mt-auto text-xs leading-6 text-[var(--muted)]">
              <p>پشتیبانی: ۰۲۱–۸۸۸۸۸۸۸۸</p>
              <p>ارسال رایگان بالای ۵ میلیون تومان</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
