import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "مقایسه محصولات",
  description: "تا ۳ محصول آگاهی را کنار هم بگذارید و قیمت، رنگ، سایز و موجودی را مقایسه کنید.",
  alternates: { canonical: "/compare" },
  robots: { index: false, follow: true },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
