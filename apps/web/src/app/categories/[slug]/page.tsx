import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { api } from "../../../lib/api";
import { CatalogView, type CatalogParams } from "../../../components/catalog-view";
import { PageRenderer, type Section } from "../../../components/cms/PageRenderer";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

type TemplateResponse = {
  entity?: Category;
  template?: { publishedVersion?: { sections: Section[] } | null } | null;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await api<Category>(`/catalog/categories/${slug}`);
    return {
      title: category.seoTitle ?? category.name,
      description: category.seoDescription ?? category.description ?? undefined,
    };
  } catch {
    return { title: "دسته‌بندی" };
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CatalogParams>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const resolved = await api<TemplateResponse>(`/cms/resolve/category/${slug}`).catch(() => null);
  let category = resolved?.entity ?? null;
  if (!category) {
    category = await api<Category>(`/catalog/categories/${slug}`).catch(() => null);
  }
  if (!category) notFound();

  const templateSections = resolved?.template?.publishedVersion?.sections?.filter((section) => section.isVisible) ?? [];

  return (
    <>
      {templateSections.length ? <PageRenderer sections={templateSections} /> : null}
      <CatalogView
        title={category.name}
        description={category.description}
        image={category.bannerUrl ?? category.imageUrl}
        params={query}
        fixedCategory={slug}
        hideFilters={Boolean(templateSections.length)}
      />
    </>
  );
}
