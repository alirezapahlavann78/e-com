import { api } from "../../lib/api";
import { PageRenderer } from "../../components/cms/PageRenderer";
import { notFound } from "next/navigation";

type Page = { title: string; metaTitle?: string | null; metaDescription?: string | null; publishedVersion?: { sections: any[] } | null };

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (["products", "api", "admin"].includes(slug)) notFound();
  try {
    const page = await api<Page>(`/cms/pages/${encodeURIComponent(slug)}`);
    return <main><PageRenderer sections={page.publishedVersion?.sections ?? []} /></main>;
  } catch {
    notFound();
  }
}
