"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

function VerifyInner() {
  const sp = useSearchParams();
  const reference = sp.get("reference") ?? "";
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!reference) return;
    fetch(`${API}/checkout/sandbox/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (r) => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(typeof d === "string" ? d : JSON.stringify(d)); setResult(d); })
      .catch((e) => setErr(String(e.message ?? e)));
  }, [reference]);

  const paid = result?.status === "PAID" || result?.payment?.status === "PAID" || result?.order?.status === "PAID";

  return (
    <main className="mx-auto max-w-lg px-6 py-20">
      <div className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-10 text-center">
        {!result && !err && <p className="text-[var(--muted)]">در حال بررسی پرداخت…</p>}
        {err && <><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl text-red-700">✕</div><h1 className="mt-4 font-display text-2xl">پرداخت ناموفق</h1><p className="mt-2 text-sm leading-7 text-[var(--muted)] break-all">{err}</p></>}
        {result && (
          <>
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {paid ? "✓" : "…"}
            </div>
            <h1 className="mt-4 font-display text-2xl">{paid ? "پرداخت با موفقیت انجام شد" : "وضعیت پرداخت"}</h1>
            {result.order?.number && <p className="mt-2 text-sm text-[var(--muted)]">سفارش شماره <b>{result.order.number}</b></p>}
            <p className="mt-1 text-xs text-[var(--muted)] break-all">مرجع: {reference}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/account/orders" className="rounded-full border border-[var(--line)] px-6 py-2.5 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]">پیگیری سفارش</Link>
              <Link href="/products" className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90">ادامه خرید</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function SandboxVerify() {
  return <Suspense><VerifyInner /></Suspense>;
}
