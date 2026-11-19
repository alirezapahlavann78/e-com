import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader, SiteFooter } from "../components/site-chrome";

export const metadata: Metadata = {
  title: { default: "Aghaci Store", template: "%s | Aghaci" },
  description: "پوشاک مدرن با کیفیت پریمیوم — فروشگاه آنلاین Aghaci",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <div className="min-h-[60vh]">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
