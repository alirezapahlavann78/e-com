"use client";

import { useEffect, useState } from "react";

import { accessToken, authHeaders } from "../../../components/cart-store";
import { formatDate } from "../../../lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  authorName?: string | null;
  isVerified: boolean;
  createdAt: string;
};

type Reviews = { items: Review[]; summary: { count: number; averageRating: number } };

function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={`${size} tracking-[0.1em] text-[var(--accent)]`} aria-label={`${value} از ۵`}>
      {"★".repeat(rounded)}
      <span className="text-[var(--line)]">{"★".repeat(Math.max(0, 5 - rounded))}</span>
    </span>
  );
}

export function ProductReviews({ slug, initial }: { slug: string; initial: Reviews }) {
  const [data, setData] = useState<Reviews>(initial);
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(initial.items.length === 0);

  const load = async () => {
    try {
      const response = await fetch(`${API}/reviews/product/${encodeURIComponent(slug)}`, { cache: "no-store" });
      if (response.ok) setData(await response.json());
    } catch {
      /* keep current */
    }
  };

  useEffect(() => {
    setData(initial);
  }, [initial]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/reviews/product/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ rating, body, authorName: authorName || undefined, title: undefined }),
      });
      if (!response.ok) throw new Error("ثبت نظر ناموفق بود");
      setMessage("نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود. متشکریم!");
      setBody("");
      await load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "خطا در ثبت نظر");
    } finally {
      setBusy(false);
    }
  };

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: data.items.filter((item) => item.rating === star).length,
  }));

  return (
    <section className="mt-20 border-t border-[var(--line)] pt-14">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.5fr] lg:gap-16">
        <div>
          <p className="eyebrow">نظرات</p>
          <h2 className="display-lg mt-2">تجربه خریداران</h2>
          <div className="mt-6 flex items-end gap-4">
            <p className="text-5xl font-bold">{data.summary.averageRating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</p>
            <div className="pb-1">
              <Stars value={data.summary.averageRating} size="text-base" />
              <p className="mt-1 text-[11px] text-[var(--muted)]">{data.summary.count.toLocaleString("fa-IR")} نظر تأییدشده</p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {distribution.map((row) => (
              <div key={row.star} className="flex items-center gap-3 text-[11px] text-[var(--muted)]">
                <span className="w-3">{row.star.toLocaleString("fa-IR")}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${data.summary.count ? (row.count / data.summary.count) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-left">{row.count.toLocaleString("fa-IR")}</span>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setOpen(true)} className="btn btn-outline mt-8 w-full">
            نوشتن نظر
          </button>
        </div>

        <div>
          {open ? (
            <form onSubmit={submit} className="card mb-8 p-6">
              <p className="text-sm font-semibold">نظر خود را ثبت کنید</p>
              <div className="mt-4 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} ستاره`}
                    onClick={() => setRating(star)}
                    className={`text-xl transition ${star <= rating ? "text-[var(--accent)]" : "text-[var(--line)]"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  className="field"
                  placeholder="نام شما (اختیاری)"
                  value={authorName}
                  onChange={(event) => setAuthorName(event.target.value)}
                />
                <input className="field" placeholder="عنوان (اختیاری)" disabled value="" />
              </div>
              <textarea
                className="field mt-3 min-h-28"
                placeholder="تجربه‌تان از این محصول…"
                required
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-[11px] text-[var(--muted)]">
                  {accessToken() ? "نظر شما به‌عنوان خریدار ثبت می‌شود." : "برای ثبت به‌عنوان خریدار وارد حساب شوید."}
                </p>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "در حال ارسال…" : "ثبت نظر"}
                </button>
              </div>
              {message ? <p className="mt-3 text-xs text-[var(--accent-strong)]">{message}</p> : null}
            </form>
          ) : null}

          <div className="divide-y divide-[var(--line)]">
            {data.items.length ? (
              data.items.map((review) => (
                <article key={review.id} className="py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)]/30 text-xs font-bold text-[var(--accent-strong)]">
                        {(review.authorName ?? "م").slice(0, 1)}
                      </span>
                      <div>
                        <p className="text-xs font-semibold">
                          {review.authorName ?? "مشتری"}
                          {review.isVerified ? <span className="mr-2 text-[10px] text-[var(--success)]">✓ خرید تأییدشده</span> : null}
                        </p>
                        <p className="text-[10px] text-[var(--muted)]">{formatDate(review.createdAt)}</p>
                      </div>
                    </div>
                    <Stars value={review.rating} size="text-xs" />
                  </div>
                  {review.title ? <p className="mt-4 text-[13px] font-semibold">{review.title}</p> : null}
                  <p className="mt-2 text-[13px] leading-8 text-[var(--muted)]">{review.body}</p>
                </article>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-[var(--muted)]">هنوز نظری برای این محصول ثبت نشده است.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WishlistButton({ productId }: { productId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "auth">("idle");

  useEffect(() => {
    if (!accessToken()) return;
    fetch(`${API}/my/wishlist`, { headers: authHeaders(), cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((items) => {
        if (Array.isArray(items) && items.some((item: { productId?: string }) => item.productId === productId)) {
          setState("done");
        }
      })
      .catch(() => undefined);
  }, [productId]);

  const toggle = async () => {
    if (!accessToken()) {
      setState("auth");
      setTimeout(() => setState("idle"), 2500);
      return;
    }
    setState("loading");
    try {
      if (state === "done") {
        await fetch(`${API}/my/wishlist/${productId}`, { method: "DELETE", headers: authHeaders() });
        setState("idle");
      } else {
        await fetch(`${API}/my/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ productId }),
        });
        setState("done");
      }
    } catch {
      setState("idle");
    }
  };

  return (
    <button type="button" onClick={toggle} className="btn btn-ghost text-xs">
      {state === "done" ? "♥ در علاقه‌مندی‌ها" : state === "auth" ? "برای ذخیره وارد شوید" : "♡ افزودن به علاقه‌مندی‌ها"}
    </button>
  );
}
