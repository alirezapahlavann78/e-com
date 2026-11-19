import Link from "next/link";

import { api } from "../lib/api";
import { HeaderClient } from "./header-client";

export type StoreLayout = {
  header?: {
    brand?: string;
    tagline?: string;
    announcement?: string;
    links?: { label: string; href: string }[];
  } | null;
  footer?: {
    about?: string;
    text?: string;
    links?: { label: string; href: string }[];
    columns?: { title: string; links: { label: string; href: string }[] }[];
    contact?: { phone?: string; email?: string; address?: string } | null;
  } | null;
};

async function getLayout(): Promise<StoreLayout> {
  try {
    return await api<StoreLayout>("/cms/layout");
  } catch {
    return {};
  }
}

export async function SiteHeader() {
  const layout = await getLayout();
  return <HeaderClient layout={layout.header ?? {}} />;
}

export async function SiteFooter() {
  const layout = await getLayout();
  const footer = layout.footer ?? {};
  const brand = layout.header?.brand ?? "آگاهی";
  const columns =
    footer.columns ??
    [
      {
        title: "خرید",
        links: [
          { label: "همه محصولات", href: "/products" },
          { label: "زنانه", href: "/categories/women" },
          { label: "مردانه", href: "/categories/men" },
        ],
      },
      {
        title: "پشتیبانی",
        links: [
          { label: "ارسال و بازگشت", href: "/shipping-and-returns" },
          { label: "داستان برند", href: "/about" },
        ],
      },
    ];

  return (
    <footer className="mt-24 bg-[var(--ink)] text-[#c8bfae]">
      <div className="shell grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <p className="text-xl font-bold tracking-[0.2em] text-white">{brand}</p>
          <p className="mt-5 max-w-xs text-sm leading-7">
            {footer.about ?? footer.text ?? "پوشاک مینیمال با تولید محدود و پارچه‌های طبیعی."}
          </p>
          <div className="mt-6 flex gap-2">
            {["اینستاگرام", "تلگرام", "پینترست"].map((label) => (
              <span key={label} className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/60">
                {label}
              </span>
            ))}
          </div>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-white">{column.title}</p>
            <ul className="mt-5 space-y-3 text-sm">
              {column.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="text-sm font-semibold text-white">تماس با ما</p>
          <ul className="mt-5 space-y-3 text-sm">
            {footer.contact?.phone ? <li dir="ltr" className="text-right">{footer.contact.phone}</li> : null}
            {footer.contact?.email ? <li dir="ltr" className="text-right">{footer.contact.email}</li> : null}
            {footer.contact?.address ? <li>{footer.contact.address}</li> : null}
          </ul>
          <div className="mt-6 flex items-center gap-2 text-[11px] text-white/50">
            <span className="rounded-md border border-white/15 px-2 py-1">پرداخت امن</span>
            <span className="rounded-md border border-white/15 px-2 py-1">ارسال بیمه‌شده</span>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-6">
        <div className="shell flex flex-col items-center justify-between gap-2 text-xs text-white/45 md:flex-row">
          <p>© {new Date().getFullYear()} {brand} — تمامی حقوق محفوظ است.</p>
          <p>طراحی و توسعه در ایران</p>
        </div>
      </div>
    </footer>
  );
}
