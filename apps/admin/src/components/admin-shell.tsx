"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AuthGuard from "./auth-guard";
import { ThemeToggle } from "./theme-toggle";
import { clearAdminTokens } from "../lib/api";

type Item = { label: string; href: string; icon: string };

const groups: { title: string; items: Item[] }[] = [
  {
    title: "فروش",
    items: [
      { label: "داشبورد", href: "/", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
      { label: "سفارش‌ها", href: "/orders", icon: "M6 2h12l2 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8l2-6zM6 8h12M9 13h6" },
      { label: "پرداخت‌ها", href: "/payments", icon: "M2 7h20v12H2zM2 11h20M6 15h4" },
      { label: "محصولات", href: "/products", icon: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8" },
      { label: "دسته‌بندی‌ها", href: "/categories", icon: "M4 5h16M4 12h16M4 19h10" },
    ],
  },
  {
    title: "محتوا",
    items: [
      { label: "صفحه‌ها و صفحه‌ساز", href: "/cms/pages", icon: "M4 4h16v16H4zM4 9h16M9 9v11" },
      { label: "نظرات", href: "/reviews", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" },
      { label: "کتابخانه رسانه", href: "/media", icon: "M3 5h18v14H3zM8 5v14M3 10h18M15 9l4 3-4 3z" },
    ],
  },
  {
    title: "مشتریان و بازاریابی",
    items: [
      { label: "مشتریان (CRM)", href: "/customers", icon: "M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
      { label: "کدهای تخفیف", href: "/discounts", icon: "M20 12l-8 8-9-9V4h7l10 8zM7.5 7.5h.01" },
      { label: "کمپین‌ها", href: "/marketing", icon: "M3 11l18-7-7 18-2-9-9-2z" },
      { label: "پیام‌ها", href: "/notifications", icon: "M4 5h16v12H8l-4 4V5z" },
      { label: "گزارش‌ها", href: "/reports", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
    ],
  },
  {
    title: "عملیات",
    items: [
      { label: "موجودی و انبار", href: "/inventory", icon: "M3 9l9-6 9 6v6l-9 6-9-6V9zM3 9l9 6 9-6M12 15v6" },
      { label: "مرجوعی‌ها", href: "/orders/returns", icon: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5" },
      { label: "کاربران و نقش‌ها", href: "/users", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" },
      { label: "تنظیمات", href: "/settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h1m14 0h1M12 4v1m0 14v1" },
    ],
  },
];

const titles: Record<string, string> = {
  "/": "داشبورد",
  "/products": "محصولات",
  "/categories": "دسته‌بندی‌ها",
  "/orders": "سفارش‌ها",
  "/orders/returns": "مرجوعی‌ها",
  "/inventory": "موجودی و انبار",
  "/customers": "مدیریت مشتریان",
  "/reviews": "نظرات مشتریان",
  "/marketing": "کمپین‌ها",
  "/discounts": "کدهای تخفیف",
  "/cms/pages": "صفحه‌ها و صفحه‌ساز",
  "/settings": "تنظیمات فروشگاه",
  "/media": "کتابخانه رسانه",
  "/reports": "گزارش‌ها و خروجی CSV",
  "/users": "کاربران و نقش‌ها",
};

function Icon({ path }: { path: string }) {
  return (
    <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem("admin_sidebar_collapsed") === "1");
    const theme = localStorage.getItem("admin_theme");
    document.documentElement.classList.toggle("dark", theme !== "light");
  }, []);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (mounted && pathname === "/login") return <>{children}</>;

  const title =
    titles[pathname] ??
    (pathname.startsWith("/cms/pages/")
      ? "ویرایش صفحه"
      : pathname.startsWith("/orders/")
        ? "جزئیات سفارش"
        : "پنل مدیریت آگاهی");

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  const toggle = () => {
    setCollapsed((value) => {
      localStorage.setItem("admin_sidebar_collapsed", value ? "0" : "1");
      return !value;
    });
  };

  const logout = () => {
    clearAdminTokens();
    router.push("/login");
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        {mobileOpen ? <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} /> : null}

        <aside
          className={`fixed inset-y-0 right-0 z-40 flex w-[248px] flex-col border-l border-[var(--border)] bg-[var(--panel)] transition-all duration-200 ${
            collapsed ? "md:w-[76px]" : "md:w-[248px]"
          } ${mobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}
        >
          <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-ink)]">آ</span>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold tracking-[0.2em]">آگاهی</p>
                <p className="truncate text-[10px] text-[var(--muted)]">پنل مدیریت</p>
              </div>
            ) : null}
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
            {groups.map((group) => (
              <div key={group.title}>
                {!collapsed ? (
                  <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{group.title}</p>
                ) : (
                  <div className="mx-2 mb-2 border-t border-[var(--border)]" />
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] transition ${
                          isActive(item.href)
                            ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                            : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--foreground)]"
                        } ${collapsed ? "justify-center px-2" : ""}`}
                      >
                        <Icon path={item.icon} />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-[var(--border)] p-3">
            <Link
              href="/"
              target="_blank"
              className={`mb-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[11.5px] text-[var(--muted)] hover:bg-[var(--panel-2)] ${collapsed ? "justify-center" : ""}`}
            >
              <Icon path="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6v6M20 4l-9 9" />
              {!collapsed ? "مشاهده فروشگاه" : null}
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="hidden w-full items-center justify-center rounded-xl px-3 py-2 text-[11px] text-[var(--muted)] hover:bg-[var(--panel-2)] md:flex"
            >
              {collapsed ? "»" : "« جمع کردن"}
            </button>
          </div>
        </aside>

        <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${collapsed ? "md:pr-[76px]" : "md:pr-[248px]"}`}>
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--panel)]/85 px-4 backdrop-blur md:px-7">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="منو"
                className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted)] md:hidden"
              >
                <Icon path="M4 6h16M4 12h16M4 18h16" />
              </button>
              <div>
                <h1 className="text-sm font-bold">{title}</h1>
                <p className="hidden text-[11px] text-[var(--muted)] sm:block">
                  {new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] text-[var(--muted)] transition hover:bg-[var(--danger)]/10 hover:text-[var(--danger)]"
              >
                <Icon path="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </header>
          <main className="fade-in flex-1 p-4 md:p-7">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
