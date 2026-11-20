"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { guestFetch } from "../../../components/cart-store";
import { formatPrice } from "../../../lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type PublicOrder = {
  number: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  email: string;
  placedAt: string | null;
  items: { name: string; quantity: number; totalPrice: number; imageUrl: string | null }[];
  payment: {
    provider: string;
    status: string;
    authority: string | null;
    refId: string | null;
    amount: number;
    paidAt: string | null;
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "پرداخت‌شده",
  PENDING: "در انتظار پرداخت",
  FAILED: "ناموفق",
  REFUNDED: "بازگشت وجه",
  AUTHORIZED: "تأییدشده",
};

function ResultInner() {
  const params = useSearchParams();
  const orderNumber = params.get("order") ?? "";
  const hint = params.get("payment") ?? "";
  const refHint = params.get("ref") ?? "";
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!orderNumber) {
      setError("شماره سفارش در آدرس نیست.");
      return;
    }
    fetch(`${API}/payments/status/${encodeURIComponent(orderNumber)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.message ?? "سفارش یافت نشد");
        setOrder(data as PublicOrder);
      })
      .catch((cause: Error) => setError(cause.message));
  }, [orderNumber]);

  useEffect(load, [load]);

  async function retry() {
    if (!order) return;
    setBusy(true);
    setError("");
    try {
      const data = await guestFetch<{ redirectUrl: string; provider: string }>(
        `/payments/orders/${encodeURIComponent(order.number)}/retry`,
        { method: "POST" },
      );
      if (data.provider === "SANDBOX") {
        const authority = new URL(data.redirectUrl).searchParams.get("authority");
        window.location.href = `/checkout/sandbox?authority=${encodeURIComponent(authority ?? "")}`;
      } else {
        window.location.href = data.redirectUrl;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "اتصال به درگاه ناموفق بود");
      setBusy(false);
    }
  }

  const paid = order?.paymentStatus === "PAID";
  const failed = Boolean(order) && !paid && (order?.paymentStatus === "FAILED" || hint === "failed");
  const refId = order?.payment?.refId ?? refHint ?? null;

  return (
    <main className="shell py-16">
      <div className="mx-auto max-w-xl rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-9 text-center">
        {!order && !error ? <p className="py-10 text-sm text-[var(--muted)]">در حال بررسی وضعیت پرداخت…</p> : null}

        {error ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger)]/10 text-2xl text-[var(--danger)]">
              !
            </div>
            <h1 className="display-lg mt-5">وضعیت سفارش در دسترس نیست</h1>
            <p className="mt-3 text-xs leading-6 text-[var(--muted)]">{error}</p>
            <Link href="/products" className="btn btn-primary mt-7 inline-flex">
              بازگشت به فروشگاه
            </Link>
          </>
        ) : null}

        {order ? (
          <>
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl ${
                paid
                  ? "bg-[var(--success)]/12 text-[var(--success)]"
                  : failed
                    ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                    : "bg-[var(--accent)]/12 text-[var(--accent)]"
              }`}
            >
              {paid ? "✓" : failed ? "✕" : "…"}
            </div>
            <h1 className="display-lg mt-5">
              {paid ? "پرداخت با موفقیت انجام شد" : failed ? "پرداخت انجام نشد" : "سفارش در انتظار پرداخت است"}
            </h1>
            <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
              {paid
                ? "رسید پرداخت برای شما ایمیل شد و سفارش در صف آماده‌سازی قرار گرفت."
                : failed
                  ? "مبلغی از حساب شما کسر نشده است. می‌توانید دوباره تلاش کنید."
                  : "اگر پرداخت را نیمه‌کاره رها کرده‌اید، از دکمه زیر ادامه دهید. موجودی اقلام ۳۰ دقیقه رزرو است."}
            </p>

            <dl className="mt-6 space-y-3 text-right text-sm">
              <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                <dt className="text-[var(--muted)]">شماره سفارش</dt>
                <dd className="font-mono text-xs">{order.number}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                <dt className="text-[var(--muted)]">مبلغ</dt>
                <dd className="font-bold">{formatPrice(order.total)}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                <dt className="text-[var(--muted)]">وضعیت پرداخت</dt>
                <dd>{STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</dd>
              </div>
              {refId ? (
                <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                  <dt className="text-[var(--muted)]">کد پیگیری پرداخت</dt>
                  <dd className="font-mono text-xs" dir="ltr">
                    {refId}
                  </dd>
                </div>
              ) : null}
              {order.payment ? (
                <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] pb-2">
                  <dt className="text-[var(--muted)]">درگاه</dt>
                  <dd>{order.payment.provider === "SANDBOX" ? "آزمایشی" : "زرین‌پال"}</dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <dt className="text-[var(--muted)]">ایمیل دریافت‌کننده رسید</dt>
                <dd className="text-xs" dir="ltr">
                  {order.email}
                </dd>
              </div>
            </dl>

            {order.items.length ? (
              <ul className="mt-6 space-y-2 rounded-2xl bg-[var(--background)] p-4 text-right text-xs">
                {order.items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      {item.name} × {item.quantity.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-[var(--muted)]">{formatPrice(item.totalPrice)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            {error ? <p className="mt-4 text-xs text-[var(--danger)]">{error}</p> : null}

            <div className="mt-7 grid gap-3">
              {!paid ? (
                <button
                  type="button"
                  onClick={retry}
                  disabled={busy}
                  className="btn btn-primary w-full disabled:opacity-60"
                >
                  {busy ? "در حال اتصال به درگاه…" : "پرداخت مجدد"}
                </button>
              ) : null}
              <div className="flex justify-center gap-3 text-xs">
                <Link href="/account/orders" className="rounded-full border border-[var(--line)] px-5 py-2.5 hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  پیگیری سفارش
                </Link>
                <Link href="/products" className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-white">
                  ادامه خرید
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function CheckoutResult() {
  return (
    <Suspense fallback={<div className="shell py-20 text-center text-sm text-[var(--muted)]">در حال بارگذاری…</div>}>
      <ResultInner />
    </Suspense>
  );
}
