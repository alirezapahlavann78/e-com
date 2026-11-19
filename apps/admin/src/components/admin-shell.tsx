"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import AuthGuard from "./auth-guard";

type NavItem = { label: string; href: string; icon: React.ReactNode };
type NavSection = { title?: string; items: NavItem[] };

const ic = (d: string) => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const sections: NavSection[] = [
  {
    items: [
      { label: "داشبورد", href: "/", icon: ic("M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10") },
    ],
  },
  {
    title: "کاتالوگ",
    items: [
      { label: "محصولات", href: "/products", icon: ic("M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8") },
      { label: "دسته‌بندی‌ها", href: "/categories", icon: ic("M4 5h16M4 12h16M4 19h10") },
    ],
  },
  {
    title: "فروش",
    items: [
      { label: "سفارش‌ها", href: "/orders", icon: ic("M6 2h12l2 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8l2-6zM6 8h12M9 13h6") },
      { label: "مرجوعی‌ها", href: "/orders/returns", icon: ic("M3 12a9 9 0 1 0 3-6.7M3 4v5h5") },
    ],
  },
  {
    title: "انبار",
    items: [
      { label: "موجودی", href: "/inventory", icon: ic("M3 9l9-6 9 6v6l-9 6-9-6V9zM3 9l9 6 9-6M12 15v6") },
    ],
  },
  {
    title: "مشتریان",
    items: [
      { label: "CRM", href: "/customers", icon: ic("M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8") },
      { label: "نظرات", href: "/reviews", icon: ic("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z") },
    ],
  },
  {
    title: "بازاریابی",
    items: [
      { label: "کمپین‌ها", href: "/marketing", icon: ic("M3 11l18-7-7 18-2-9-9-2z") },
      { label: "کد تخفیف", href: "/discounts", icon: ic("M20 12l-8 8-9-9V4h7l10 8zM7.5 7.5h.01") },
    ],
  },
  {
    title: "محتوا",
    items: [
      { label: "صفحات CMS", href: "/cms/pages", icon: ic("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M9 13h6M9 17h4") },
      { label: "رسانه", href: "/media", icon: ic("M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13l2.5 3 3.5-4.5L19 17H5l3.5-4z") },
    ],
  },
  {
    title: "سیستم",
    items: [
      { label: "کاربران", href: "/users", icon: ic("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z") },
      { label: "نقش‌ها", href: "/roles", icon: ic("M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.2 13.9L7 23l5-3 5 3-1.2-9.1") },
      { label: "تنظیمات", href: "/settings", icon: ic("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.2-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.2 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z") },
      { label: "لاگ ممیزی", href: "/audit", icon: ic("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z") },
    ],
  },
];

const titleByPath: Record<string, string> = {
  "/": "داشبورد",
  "/products": "محصولات",
  "/categories": "دسته‌بندی‌ها",
  "/orders": "سفارش‌ها",
  "/orders/returns": "مرجوعی‌ها",
  "/inventory": "موجودی انبار",
  "/customers": "مدیریت مشتریان",
  "/reviews": "نظرات",
  "/marketing": "کمپین‌ها",
  "/discounts": "کدهای تخفیف",
  "/cms/pages": "صفحات CMS",
  "/media": "رسانه",
  "/users": "کاربران",
  "/roles": "نقش‌ها",
  "/settings": "تنظیمات",
  "/audit": "لاگ ممیزی",
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    if (saved === "1") setCollapsed(true);
    const t = localStorage.getItem("admin_theme");
    document.documentElement.classList.toggle("dark", !(t === "light"));
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isLogin = mounted && pathname === "/login";
  if (isLogin) return <>{children}</>;

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("admin_sidebar_collapsed", c ? "0" : "1");
      return !c;
    });
  };

  function logout() {
    localStorage.removeItem("admin_access_token");
    localStorage.removeItem("admin_refresh_token");
    router.push("/login");
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const sidebarWidth = collapsed ? "md:w-16" : "md:w-64";

  const nav = (
    <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
      {sections.map((sec, i) => (
        <div key={i}>
          {sec.title && !collapsed ? (
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{sec.title}</p>
          ) : sec.title ? (
            <div className="mx-3 my-2 border-t border-[var(--border)]" />
          ) : null}
          <ul className="space-y-0.5">
            {sec.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive(item.href)
                      ? "bg-sky-500/10 font-medium text-sky-600 dark:text-sky-400"
                      : "text-[var(--muted)] hover:bg-[var(--panel-2)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {item.icon}
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen">
        {/* mobile overlay */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
        ) : null}

        {/* sidebar (right, RTL) */}
        <aside
          className={`fixed inset-y-0 right-0 z-40 flex w-64 flex-col border-l border-[var(--border)] bg-[var(--panel)] transition-transform duration-200 md:translate-x-0 ${sidebarWidth} ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white dark:bg-sky-400 dark:text-slate-900">آ</span>
            {!collapsed ? <span className="text-sm font-bold tracking-[0.25em] text-[var(--foreground)]">AGHACI</span> : null}
          </div>
          {nav}
          <button
            onClick={toggleCollapsed}
            className="hidden border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)] hover:bg-[var(--panel-2)] md:block"
            aria-label={collapsed ? "باز کردن منو" : "جمع کردن منو"}
          >
            {collapsed ? "«" : "» جمع کردن منو"}
          </button>
        </aside>

        {/* main */}
        <div className={`flex min-h-screen flex-col transition-[padding] duration-200 md:pr-64 ${collapsed ? "md:pr-16!" : ""}`}>
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--panel)]/90 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileOpen(true)}
                className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--panel-2)] md:hidden"
                aria-label="باز کردن منو"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <h1 className="text-sm font-semibold text-[var(--foreground)]">
                {(mounted && titleByPath[pathname]) ?? "پنل مدیریت آقاصادقی"}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <button
                onClick={logout}
                className="mr-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
                title="خروج از حساب"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
