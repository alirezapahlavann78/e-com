import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aghaci Store",
  description: "Modern fashion e-commerce storefront",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa">
      <body>{children}</body>
    </html>
  );
}
