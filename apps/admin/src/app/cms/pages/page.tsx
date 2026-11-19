"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "../../../lib/api";

type Page = { id: string; title: string; slug: string; type: string; status: string; updatedAt: string };

export default function CmsPages() {
  const [items, setItems] = useState<Page[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", slug: "", type: "CUSTOM", heroTitle: "", heroSubtitle: "" });

  async function load() { try { setItems(await adminApi<Page[]>("/admin/cms/pages")); } catch (e: any) { setError(e.message || "Load failed. Login first."); } }
  useEffect(() => { load(); }, []);

  async function create() {
    setError("");
    try {
      await adminApi("/admin/cms/pages", { method: "POST", body: JSON.stringify({ title: form.title, slug: form.slug, type: form.type, status: "DRAFT", sections: form.heroTitle ? [{ type: "hero", config: { title: form.heroTitle, subtitle: form.heroSubtitle, ctaLabel: "مشاهده محصولات", ctaHref: "/products" } }] : [] }) });
      setForm({ title: "", slug: "", type: "CUSTOM", heroTitle: "", heroSubtitle: "" }); await load();
    } catch (e: any) { setError(e.message || "Create failed"); }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-semibold">CMS Pages</h1><Link href="/login" className="text-[var(--accent)]">Login</Link></div>
      {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200 whitespace-pre-wrap">{error}</p> : null}
      <section className="mt-6 rounded-2xl border border-white/10 bg-[var(--panel)] p-5">
        <h2 className="font-medium">Create page (DB-backed)</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className="rounded-lg bg-black/20 p-3" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
          <input className="rounded-lg bg-black/20 p-3" placeholder="slug" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} />
          <input className="rounded-lg bg-black/20 p-3 md:col-span-2" placeholder="Hero title (optional section)" value={form.heroTitle} onChange={e=>setForm({...form,heroTitle:e.target.value})} />
          <input className="rounded-lg bg-black/20 p-3 md:col-span-2" placeholder="Hero subtitle" value={form.heroSubtitle} onChange={e=>setForm({...form,heroSubtitle:e.target.value})} />
        </div>
        <button onClick={create} className="mt-4 rounded-lg bg-sky-400 px-4 py-2 font-medium text-slate-900">Create draft</button>
      </section>
      <section className="mt-6 space-y-3">
        {items.map((p) => (
          <Link key={p.id} href={`/cms/pages/${p.id}`} className="block rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="font-medium">{p.title} <span className="text-xs text-slate-400">/{p.slug}</span></div>
            <div className="mt-1 text-xs text-slate-400">{p.type} · {p.status}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
