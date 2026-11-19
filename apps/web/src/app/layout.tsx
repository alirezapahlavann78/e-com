import type { Metadata, Viewport } from "next";

import "./globals.css";
import { CompareBar } from "../components/compare-store";
import { JsonLd, organizationJsonLd } from "../components/json-ld";
import { SiteFooter, SiteHeader } from "../components/site-chrome";

export const metadata: Metadata = {
  title: {
    default: "آگاهی | پوشاک مینیمال ایرانی",
    template: "%s | آگاهی",
  },
  description:
    "آگاهی، فروشگاه پوشاک مینیمال با تولید محدود، پارچه‌های طبیعی و دوخت ماندگار. خرید آنلاین کالکشن پاییز.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "آگاهی | پوشاک مینیمال ایرانی",
    description: "کالکشن پاییز آگاهی — تولید محدود، پارچه طبیعی.",
    type: "website",
    locale: "fa_IR",
    siteName: "آگاهی",
  },
  twitter: {
    card: "summary_large_image",
    title: "آگاهی | پوشاک مینیمال ایرانی",
    description: "کالکشن پاییز آگاهی — تولید محدود، پارچه طبیعی.",
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");document.documentElement.dataset.theme=s||(d?"dark":"light");}catch(e){}})();`;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e8" },
    { media: "(prefers-color-scheme: dark)", color: "#131110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      {/* suppressHydrationWarning on <body> too: browser extensions inject attributes
          (cz-shortcut-listen, Grammarly, …) before React hydrates. */}
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        {/* Applies the saved theme before first paint to avoid a light flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <JsonLd data={organizationJsonLd(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")} />
        <SiteHeader />
        <main className="min-h-[55vh]">{children}</main>
        <SiteFooter />
        <CompareBar />
      </body>
    </html>
  );
}
