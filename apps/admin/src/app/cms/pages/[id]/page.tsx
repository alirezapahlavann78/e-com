"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { adminApi } from "../../../../lib/api";

export default function CmsPageDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [page, setPage] = useState<any>(null);
  const [error, setError] = useState("");
  const [section, setSection] = useState({ type: "rich_text", title: "", body: "" });
  async function load() { if (!id) return; try { setPage(await adminApi(`/admin/cms/pages/${id}`)); } catch (e: any) { setError(e.message); } }
  useEffect(() => { load(); }, [id]);
  async function addSection() {
    if (!page) return;
    const sections = [...(page.draftVersion?.sections ?? page.publishedVersion?.sections ?? []).map((s: any) => ({ type: s.type, sortOrder: s.sortOrder, isVisible: s.isVisible, config: s.config })), { type: section.type, config: { title: section.title, body: section.body, text: section.body } }];
    try { await adminApi(`/admin/cms/pages/${id}`, { method: "PATCH", body: JSON.stringify({ title: page.title, slug: page.slug, sections }) }); setSection({ type: "rich_text", title: "", body: "" }); await load(); } catch (e: any) { setError(e.message); }
  }
  async function publish() { try { await adminApi(`/admin/cms/pages/${id}/publish`, { method: "POST", body: JSON.stringify({}) }); await load(); } catch (e: any) { setError(e.message); } }
  if (!page) return <main className="p-10 text-slate-300">Loading... {error}</main>;
  const sections = page.draftVersion?.sections ?? page.publishedVersion?.sections ?? [];
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold">{page.title}</h1><button onClick={publish} className="rounded-lg bg-emerald-400 px-4 py-2 font-medium text-slate-900">Publish</button></div>
      <p className="mt-2 text-sm text-slate-400">/{page.slug} · {page.status} · DB-backed sections render on storefront</p>
      {error ? <p className="mt-4 whitespace-pre-wrap text-sm text-red-300">{error}</p> : null}
      <section className="mt-6 rounded-2xl border border-white/10 bg-[var(--panel)] p-5">
        <h2 className="font-medium">Add section (saves to DB)</h2>
        <div className="mt-3 grid gap-3">
          <select className="rounded-lg bg-black/20 p-3" value={section.type} onChange={e=>setSection({...section,type:e.target.value})}>{["hero","rich_text","product_grid","promotional_banners","faq","newsletter","image_text","testimonials"].map(t=><option key={t} value={t}>{t}</option>)}</select>
          <input className="rounded-lg bg-black/20 p-3" placeholder="Title/config title" value={section.title} onChange={e=>setSection({...section,title:e.target.value})} />
          <textarea className="rounded-lg bg-black/20 p-3" rows={4} placeholder="Body/config text" value={section.body} onChange={e=>setSection({...section,body:e.target.value})} />
        </div>
        <button onClick={addSection} className="mt-4 rounded-lg bg-sky-400 px-4 py-2 font-medium text-slate-900">Save as new draft version</button>
      </section>
      <section className="mt-6 space-y-3">{sections.map((s: any) => <div key={s.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="font-medium">{s.sortOrder}. {s.type}</div><pre className="mt-2 overflow-auto text-xs text-slate-300">{JSON.stringify(s.config,null,2)}</pre></div>)}</section>
    </main>
  );
}
