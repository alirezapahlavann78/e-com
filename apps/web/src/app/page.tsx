import Link from "next/link";

import { api } from "../lib/api";
import { PageRenderer, type Section } from "../components/cms/PageRenderer";
import { ProductGrid, type ProductCardData } from "../components/product-card";

type Page = {
  title?: string;
  publishedVersion?: { sections: Section[] } | null;
};

export const revalidate = 60;

export default async function HomePage() {
  const [page, products] = await Promise.all([
    api<Page>("/cms/home").catch(() => null),
    api<{ items: ProductCardData[] }>("/catalog/products?limit=4&sort=newest").catch(() => ({ items: [] })),
  ]);

  const sections = page?.publishedVersion?.sections ?? [];

  if (sections.length) {
    return <PageRenderer sections={sections} />;
  }

  // Fallback keeps the storefront usable before the CMS page is published.
  return (
    <div className="shell section">
      <p className="eyebrow">آگاهی — کالکشن پاییز</p>
      <h1 className="display-xl mt-4 max-w-2xl">پوشاکی که با تو نفس می‌کشد</h1>
      <p className="lead mt-6 max-w-xl">
        پارچه‌های طبیعی، برش‌های آرام و دوخت ماندگار. برای دیدن کالکشن کامل به فروشگاه بروید.
      </p>
      <Link href="/products" className="btn btn-primary mt-8">
        مشاهده محصولات
      </Link>
      <div className="mt-16">
        <ProductGrid products={products.items} />
      </div>
    </div>
  );
}
