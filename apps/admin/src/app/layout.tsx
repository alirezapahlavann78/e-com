import type { Metadata } from "next";

import "./globals.css";
import AdminShell from "../components/admin-shell";

export const metadata: Metadata = {
  title: "پنل مدیریت آگاهی",
  description: "مدیریت فروشگاه، سفارش‌ها، محتوا و صفحه‌ساز",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
