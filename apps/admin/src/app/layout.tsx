import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aghaci Admin",
  description: "E-commerce administration dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa">
      <body>{children}</body>
    </html>
  );
}
