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
    <main className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-sm tracking-[0.3em] text-[var(--accent)]">AGHACI</p>
      <h1 className="mt-4 text-5xl font-semibold">فروشگاه مد پوشاک</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">صفحه Home از CMS بارگذاری نشد؛ API/seed را بررسی کنید.</p>
      <Link href="/products" className="mt-8 inline-block rounded-xl bg-stone-900 px-5 py-3 text-white">مشاهده محصولات</Link>
    </main>
  );
}
