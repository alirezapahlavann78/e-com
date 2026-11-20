"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { formatPrice } from "../../../lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type Session = {
  authority: string;
  amount: number;
  currency: string;
  status: string;
  orderNumber: string;
  orderStatus: string;
  itemsCount: number;
  email: string;
  merchant: string;
};

function SandboxInner() {
  const params = useSearchParams();
  const authority = params.get("authority") ?? "";
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authority) {
      setError("شناسه تراکنش در آدرس نیست.");
      return;
    }
    fetch(`${API}/payments/sandbox/session?authority=${encodeURIComponent(authority)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message ?? "تراکنش یافت نشد");
        setSession(data as Session);
      })
      .catch((cause: Error) => setError(cause.message));
  }, [authority]);

  async function complete(outcome: "success" | "cancel") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API}/payments/sandbox/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authority, outcome }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? "پردازش تراکنش ناموفق بود");
      const status = outcome === "success" ? "paid" : "failed";
      window.location.href = `/checkout/result?order=${encodeURIComponent(data.orderNumber)}&payment=${status}${
        data.refId ? `&ref=${encodeURIComponent(data.refId)}` : ""
      }`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "پردازش تراکنش ناموفق بود");
      setBusy(false);
    }
  }

  return (
    <main className="shell py-16">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between rounded-t-[28px] bg-[var(--ink)] px-6 py-4 text-white">
          <span className="text-[11px] tracking-[0.28em] opacity-70">TEST GATEWAY</span>
          <span className="text-xs">درگاه آزمایشی</span>
        </div>
        <div className="rounded-b-[28px] border border-t-0 border-[var(--line)] bg-[var(--panel)] p-7">
          {!session && !error ? <p className="py-8 text-center text-sm text-[var(--muted)]">در حال دریافت اطلاعات تراکنش…</p> : null}
          {error ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--danger)]/10 text-2xl text-[var(--danger)]">
                ✕
              </div>
              <h1 className="display-lg mt-4">تراکنش قابل نمایش نیست</h1>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{error}</p>
              <Link href="/products" className="btn mt-6 inline-flex">
                بازگشت به فروشگاه
              </Link>
            </div>
          ) : null}

          {session ? (
            <>
              <h1 className="display-lg">پرداخت سفارش</h1>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                این صفحه شبیه‌ساز درگاه بانکی است و فقط در محیط توسعه استفاده می‌شود. با تأیید، همان مسیر callback
                واقعی اجرا می‌شود (تأیید تراکنش → به‌روزرسانی سفارش → پیام‌های تراکنشی).
              </p>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                  <dt className="text-[var(--muted)]">پذیرنده</dt>
                  <dd className="font-medium">{session.merchant}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                  <dt className="text-[var(--muted)]">شماره سفارش</dt>
                  <dd className="font-mono text-xs">{session.orderNumber}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                  <dt className="text-[var(--muted)]">تعداد اقلام</dt>
                  <dd>{session.itemsCount.toLocaleString("fa-IR")}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                  <dt className="text-[var(--muted)]">ایمیل خریدار</dt>
                  <dd className="text-xs" dir="ltr">
                    {session.email}
                  </dd>
                </div>
                <div className="flex items-center justify-between pt-1 text-base">
                  <dt className="text-[var(--muted)]">مبلغ قابل پرداخت</dt>
                  <dd className="font-bold">{formatPrice(session.amount)}</dd>
                </div>
              </dl>

              {session.status !== "PENDING" ? (
                <p className="mt-6 rounded-xl bg-[var(--background)] px-4 py-3 text-xs text-[var(--muted)]">
                  این تراکنش قبلاً پردازش شده است ({session.status}). می‌توانید نتیجه را در صفحه سفارش ببینید.
                </p>
              ) : null}

              {error ? <p className="mt-4 text-xs text-[var(--danger)]">{error}</p> : null}

              <div className="mt-7 grid gap-3">
                <button
                  type="button"
                  disabled={busy || session.status !== "PENDING"}
                  onClick={() => complete("success")}
                  className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "در حال پردازش…" : `پرداخت ${formatPrice(session.amount)}`}
                </button>
                <button
                  type="button"
                  disabled={busy || session.status !== "PENDING"}
                  onClick={() => complete("cancel")}
                  className="btn w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  انصراف از پرداخت
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function SandboxCheckout() {
  return (
    <Suspense fallback={<div className="shell py-20 text-center text-sm text-[var(--muted)]">در حال بارگذاری…</div>}>
      <SandboxInner />
    </Suspense>
  );
}
