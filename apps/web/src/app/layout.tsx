import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aghaci Store",
  description: "Modern fashion e-commerce storefront",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa">
      <body><header className="border-b border-stone-200 bg-white/80"><div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4"><Link href="/" className="font-semibold tracking-[0.2em]">AGHACI</Link><nav className="flex gap-4 text-sm"><Link href="/products">محصولات</Link><Link href="/cart">سبد خرید</Link></nav></div></header>{children}</body>
    </html>
  );
}
