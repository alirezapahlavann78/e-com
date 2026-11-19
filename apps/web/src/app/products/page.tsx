import type { Metadata } from "next";

import { CatalogView, type CatalogParams } from "../../components/catalog-view";

export const metadata: Metadata = {
  title: "همه محصولات",
  description: "کالکشن کامل آگاهی — پوشاک مینیمال زنانه و مردانه، کیف و کفش چرم و شال ابریشم.",
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  return (
    <CatalogView
      title={params.q ? `نتایج جستجو برای «${params.q}»` : "همه محصولات"}
      description="کالکشن کامل آگاهی؛ تولید محدود با پارچه‌های طبیعی. فیلترها را برای رسیدن سریع‌تر به استایل خودت استفاده کن."
      params={params}
    />
  );
}
