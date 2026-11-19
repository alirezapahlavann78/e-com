import { permanentRedirect } from "next/navigation";

/** Legacy `/pages/:slug` URLs (and slug-change redirects) point at the canonical `/:slug` route. */
export default async function LegacyPageAlias({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}
