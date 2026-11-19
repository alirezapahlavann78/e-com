"use client";
import { useEffect, useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
import { formatDate } from "../../../lib/format";

function Stars({ n }: { n: number }) {
  return <span className="text-amber-500">{"★".repeat(Math.round(n))}<span className="text-[var(--line)]">{"★".repeat(5 - Math.round(n))}</span></span>;
}

export function ProductReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    try {
      const r = await fetch(`${API}/reviews/product/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch {}
  };
  useEffect(() => { load(); }, [slug]);

  const submit = async (e: any) => {
    e.preventDefault(); setMsg("");
    const t = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const r = await fetch(`${API}/reviews/product/${encodeURIComponent(slug)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: JSON.stringify({ rating, body }),
    });
    setMsg(r.ok ? "نظر ثبت شد و پس از بررسی نمایش داده می‌شود. متشکریم!" : "ثبت نظر ناموفق بود — ابتدا وارد حساب شوید.");
    if (r.ok) { setBody(""); load(); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="font-display text-2xl">نظرات مشتریان</h2>
        {data?.summary && (
          <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <Stars n={Number(data.summary.averageRating ?? 0)} />
            میانگین {(Number(data.summary.averageRating ?? 0)).toLocaleString("fa-IR", { maximumFractionDigits: 1 })} از {(data.summary.count ?? 0).toLocaleString("fa-IR")} نظر
          </p>
        )}
      </div>

      <form onSubmit={submit} className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <p className="font-medium">ثبت نظر شما</p>
        <div className="mt-4 flex items-center gap-2">
          {[5, 4, 3, 2, 1].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} className={`text-xl transition ${n <= rating ? "text-amber-500" : "text-[var(--line)] hover:text-amber-300"}`} aria-label={`${n} ستاره`}>★</button>
          ))}
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={5} rows={3}
          className="mt-4 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-4 py-3 text-sm" placeholder="تجربه شما از این محصول…" />
        <button type="submit" className="mt-3 rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90">ارسال نظر</button>
        {msg && <p className="mt-3 text-sm text-[var(--muted)]">{msg}</p>}
      </form>

      <div className="mt-6 space-y-4">
        {data?.items?.map((r: any) => (
          <article key={r.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex items-center justify-between">
              <Stars n={r.rating} />
              <span className="text-xs text-[var(--muted)]">{formatDate(r.createdAt)}</span>
            </div>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            <p className="mt-1 text-sm leading-7 text-[var(--muted)]">{r.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function WishlistButton({ productId }: { productId: string }) {
  const [msg, setMsg] = useState("");
  const add = async () => {
    const t = localStorage.getItem("access_token");
    if (!t) { setMsg("برای علاقه‌مندی وارد حساب شوید."); return; }
    const r = await fetch(`${API}/my/wishlist`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ productId }) });
    setMsg(r.ok ? "به علاقه‌مندی‌ها اضافه شد ✓" : "ناموفق بود.");
  };
  return (
    <div>
      <button onClick={add} className="rounded-full border border-[var(--line)] px-8 py-4 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
        ♡ افزودن به علاقه‌مندی‌ها
      </button>
      {msg && <p className="mt-2 text-sm text-[var(--muted)]">{msg}</p>}
    </div>
  );
}
