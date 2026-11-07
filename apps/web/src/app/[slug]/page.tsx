import { api } from "../../lib/api";
import { PageRenderer } from "../../components/cms/PageRenderer";
import { notFound, permanentRedirect } from "next/navigation";

type Page = { title: string; publishedVersion?: { sections: any[] } | null };

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (["products", "api", "admin", "categories", "brands", "login"].includes(slug)) notFound();
  try {
    const page = await api<Page>(`/cms/pages/${encodeURIComponent(slug)}`);
    return <main><PageRenderer sections={page.publishedVersion?.sections ?? []} /></main>;
  } catch {
    const redirect = await api<{ toPath?: string } | null>(`/redirects/resolve?path=${encodeURIComponent(`/pages/${slug}`)}`).catch(() => null);
    if (redirect?.toPath) permanentRedirect(redirect.toPath);
    notFound();
  }
}
