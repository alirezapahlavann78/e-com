"use client";

import { useEffect, useRef, useState } from "react";

import { accessToken, authHeaders } from "../../../components/cart-store";
import { formatDate } from "../../../lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const MAX_PHOTOS = 3;

type ReviewImage = { id: string; url: string; alt?: string | null };

type Review = {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  authorName?: string | null;
  isVerified: boolean;
  createdAt: string;
  images?: ReviewImage[];
};

type Reviews = { items: Review[]; summary: { count: number; averageRating: number; photoCount?: number } };

function Stars({ value, size = "text-sm" }: { value: number; size?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={`${size} tracking-[0.1em] text-[var(--accent)]`} aria-label={`${value} از ۵`}>
      {"★".repeat(rounded)}
      <span className="text-[var(--line)]">{"★".repeat(Math.max(0, 5 - rounded))}</span>
    </span>
  );
}

function Lightbox({ photos, index, onClose }: { photos: ReviewImage[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index);
  const photo = photos[current];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setCurrent((value) => Math.min(photos.length - 1, value + 1));
      if (event.key === "ArrowRight") setCurrent((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, photos.length]);

  if (!photo) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="relative max-h-full w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          aria-label="بستن"
          className="absolute -top-11 end-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white"
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.alt ?? "عکس خریدار"} className="max-h-[76vh] w-full rounded-2xl object-contain" />
        {photos.length > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setCurrent((value) => Math.max(0, value - 1))}
              disabled={current === 0}
              className="rounded-full border border-white/30 px-4 py-1.5 text-xs text-white disabled:opacity-30"
            >
              قبلی
            </button>
            <span className="text-[11px] text-white/70">
              {(current + 1).toLocaleString("fa-IR")} از {photos.length.toLocaleString("fa-IR")}
            </span>
            <button
              type="button"
              onClick={() => setCurrent((value) => Math.min(photos.length - 1, value + 1))}
              disabled={current === photos.length - 1}
              className="rounded-full border border-white/30 px-4 py-1.5 text-xs text-white disabled:opacity-30"
            >
              بعدی
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProductReviews({ slug, initial }: { slug: string; initial: Reviews }) {
  const [data, setData] = useState<Reviews>(initial);
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<{ url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(initial.items.length === 0);
  const [viewer, setViewer] = useState<{ photos: ReviewImage[]; index: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const addPhoto = async (file: File) => {
    if (photos.length >= MAX_PHOTOS) {
      setMessage("حداکثر ۳ عکس می‌توانید پیوست کنید.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage("فقط فایل تصویری مجاز است.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setMessage("حجم هر عکس باید کمتر از ۴ مگابایت باشد.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود"));
        reader.readAsDataURL(file);
      });
      const response = await fetch(`${API}/reviews/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ dataUrl, mimeType: file.type, filename: file.name }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "بارگذاری عکس ناموفق بود");
      }
      const uploaded = (await response.json()) as { url: string };
      setPhotos((current) => [...current, { url: uploaded.url }]);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "بارگذاری عکس ناموفق بود");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API}/reviews/product/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ rating, body, authorName: authorName || undefined, images: photos.map((photo) => photo.url) }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "ثبت نظر ناموفق بود");
      }
      setMessage("نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود. متشکریم!");
      setBody("");
      setPhotos([]);
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
  const allPhotos = data.items.flatMap((review) => review.images ?? []);

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
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {data.summary.count.toLocaleString("fa-IR")} نظر تأییدشده
                {data.summary.photoCount ? <span> · {data.summary.photoCount.toLocaleString("fa-IR")} عکس خریداران</span> : null}
              </p>
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

          {allPhotos.length ? (
            <div className="mt-8">
              <p className="mb-3 text-xs font-bold">عکس‌های خریداران</p>
              <div className="grid grid-cols-4 gap-2">
                {allPhotos.slice(0, 8).map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setViewer({ photos: allPhotos, index })}
                    className="overflow-hidden rounded-lg bg-[var(--image-bg)]"
                    aria-label="نمایش عکس خریدار"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.alt ?? "عکس خریدار"} loading="lazy" className="aspect-square w-full object-cover transition hover:scale-105" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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
                maxLength={2000}
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />

              <div className="mt-4">
                <p className="field-label">عکس‌های شما (حداکثر ۳)</p>
                <div className="flex flex-wrap items-center gap-2">
                  {photos.map((photo) => (
                    <div key={photo.url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--line)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt="پیش‌نمایش عکس" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos((current) => current.filter((entry) => entry.url !== photo.url))}
                        aria-label="حذف عکس"
                        className="absolute end-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInput.current?.click()}
                      className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--line)] text-[10px] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <span className="text-lg leading-none">＋</span>
                      {uploading ? "…" : "عکس"}
                    </button>
                  ) : null}
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void addPhoto(file);
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-[11px] text-[var(--muted)]">
                  {accessToken() ? "نظر شما به‌عنوان خریدار ثبت می‌شود." : "برای ثبت به‌عنوان خریدار وارد حساب شوید."}
                </p>
                <button type="submit" className="btn btn-primary" disabled={busy || uploading}>
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
                  {review.images?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {review.images.map((photo, index) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => setViewer({ photos: review.images!, index })}
                          className="h-20 w-20 overflow-hidden rounded-lg bg-[var(--image-bg)]"
                          aria-label="بزرگ‌نمایی عکس خریدار"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.url} alt={photo.alt ?? "عکس خریدار"} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-[var(--muted)]">هنوز نظری برای این محصول ثبت نشده است.</p>
            )}
          </div>
        </div>
      </div>

      {viewer ? <Lightbox photos={viewer.photos} index={viewer.index} onClose={() => setViewer(null)} /> : null}
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
