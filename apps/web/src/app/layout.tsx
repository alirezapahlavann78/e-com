import type { Metadata, Viewport } from "next";

import "./globals.css";
import { CompareBar } from "../components/compare-store";
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
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f1e8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      {/* suppressHydrationWarning on <body> too: browser extensions inject attributes
          (cz-shortcut-listen, Grammarly, …) before React hydrates. */}
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <SiteHeader />
        <main className="min-h-[55vh]">{children}</main>
        <SiteFooter />
        <CompareBar />
      </body>
    </html>
  );
}
