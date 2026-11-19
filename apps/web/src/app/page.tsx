import Link from "next/link";
import { api } from "../lib/api";
import { PageRenderer } from "../components/cms/PageRenderer";

type Page = { publishedVersion?: { sections: any[] } | null };

export default async function HomePage() {
  try {
    const page = await api<Page>("/cms/home");
    if (page.publishedVersion?.sections?.length) return <main><PageRenderer sections={page.publishedVersion.sections} /></main>;
  } catch {}
  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <p className="eyebrow">AGHACI</p>
      <h1 className="mt-4 font-display text-5xl">فروشگاه مد پوشاک</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">صفحه Home از CMS بارگذاری نشد؛ API/seed را بررسی کنید.</p>
      <Link href="/products" className="mt-8 inline-block rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-medium text-white transition hover:opacity-90">مشاهده محصولات</Link>
    </main>
  );
}
