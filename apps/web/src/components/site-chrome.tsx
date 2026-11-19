import Link from "next/link";
import { api } from "../lib/api";
import { SearchBox, MiniCart } from "./search-box";

type Layout = { header?: { brand?: string; links?: { label: string; href: string }[] } | null; footer?: { text?: string; links?: { label: string; href: string }[] } | null };

async function getLayout(): Promise<Layout> {
  try { return await api<Layout>("/cms/layout"); } catch { return {}; }
}

export async function SiteHeader() {
  const layout = await getLayout();
  const brand = layout.header?.brand ?? "AGHACI";
  const links = layout.header?.links ?? [{ label: "خانه", href: "/" }, { label: "محصولات", href: "/products" }];
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--background)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="text-lg font-semibold tracking-[0.28em] text-[var(--foreground)]">{brand}</Link>
        <nav className="hidden flex-1 items-center gap-6 text-sm text-[var(--muted)] md:flex">
          {links.map((l) => <Link key={l.href + l.label} href={l.href} className="link-underline hover:text-[var(--foreground)]">{l.label}</Link>)}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-3 md:flex-none">
          <SearchBox />
          <MiniCart />
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const layout = await getLayout();
  const links = layout.footer?.links ?? [{ label: "محصولات", href: "/products" }];
  return (
    <footer className="mt-20 border-t border-[var(--line)] bg-[#1a1713] text-[#b9b1a4]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <p className="text-lg font-semibold tracking-[0.28em] text-white">{layout.header?.brand ?? "AGHACI"}</p>
          <p className="mt-4 max-w-xs text-sm leading-7">{layout.footer?.text ?? "پوشاک مدرن با کیفیت پریمیوم."}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-white">دسترسی سریع</p>
          <ul className="mt-4 space-y-3 text-sm">
            {links.map((l) => <li key={l.href + l.label}><Link href={l.href} className="link-underline">{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium text-white">خدمات مشتریان</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li>پیگیری سفارش</li><li>شرایط بازگشت کالا</li><li>حریم خصوصی</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-[#6f675c]">© {new Date().getFullYear()} Aghaci — تمامی حقوق محفوظ است.</div>
    </footer>
  );
}
