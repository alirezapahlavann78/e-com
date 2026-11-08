"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function ProductReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const load = async () => { try { const r = await fetch(`${API}/reviews/product/${encodeURIComponent(slug)}`, { cache: "no-store" }); if (r.ok) setData(await r.json()); } catch {} };
  useEffect(() => { load(); }, [slug]);
  const submit = async (e: any) => {
    e.preventDefault(); setMsg("");
    const t = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const r = await fetch(`${API}/reviews/product/${encodeURIComponent(slug)}`, { method: "POST", headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ rating, body }) });
    setMsg(r.ok ? "نظر ثبت شد و پس از بررسی نمایش داده می‌شود." : "ثبت نظر ناموفق بود.");
    if (r.ok) setBody("");
  };
  return <section className="mt-10 border-t border-stone-200 pt-8">
    <h2 className="text-xl font-medium">نظرات مشتریان</h2>
    <div className="mt-2 text-sm text-stone-600">میانگین: {Number(data?.summary?.averageRating ?? 0).toFixed(1)} ({data?.summary?.count ?? 0} نظر)</div>
    <form onSubmit={submit} className="mt-4 space-y-2 rounded-xl border bg-white p-4">
      <div className="font-medium text-sm">ثبت نظر</div>
      <select value={rating} onChange={(e)=>setRating(Number(e.target.value))} className="rounded border px-2 py-1">{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} ستاره</option>)}</select>
      <textarea value={body} onChange={(e)=>setBody(e.target.value)} required minLength={5} className="w-full rounded border px-3 py-2" placeholder="تجربه شما از محصول..." />
      <button className="rounded-lg bg-stone-900 px-4 py-2 text-white text-sm">ارسال نظر</button>
      {msg && <div className="text-sm text-stone-700">{msg}</div>}
    </form>
    <div className="mt-4 space-y-3">{data?.items?.map((r: any) => <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4"><div className="text-sm text-amber-700">{"★".repeat(r.rating)}</div>{r.title && <div className="font-medium">{r.title}</div>}<div className="text-sm text-stone-700">{r.body}</div></div>)}</div>
  </section>;
}

export function WishlistButton({ productId }: { productId: string }) {
  const [msg, setMsg] = useState("");
  const add = async () => {
    const t = localStorage.getItem("accessToken");
    if (!t) { setMsg("برای علاقه‌مندی وارد حساب شوید."); return; }
    const r = await fetch(`${API}/my/wishlist`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ productId }) });
    setMsg(r.ok ? "به علاقه‌مندی‌ها اضافه شد." : "ناموفق بود.");
  };
  return <div className="mt-3"><button onClick={add} className="rounded-xl border border-stone-300 px-4 py-2 text-sm">افزودن به علاقه‌مندی‌ها</button>{msg && <div className="mt-1 text-sm text-stone-600">{msg}</div>}</div>;
}
