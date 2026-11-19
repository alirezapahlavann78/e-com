"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { guestFetch } from "../../components/cart-store";
import { formatPrice } from "../../lib/format";

export default function CheckoutPage() {
  const [form, setForm] = useState({ email: "", fullName: "", province: "", city: "", address1: "", postalCode: "", note: "" });
  const [cart, setCart] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { guestFetch("/cart").then(setCart).catch(() => {}); }, []);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.email && form.fullName && form.province && form.city && form.address1;

  async function submit() {
    setErr(""); setBusy(true);
    try {
      const data = await guestFetch("/checkout", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          customerNote: form.note || undefined,
          shippingAddress: { fullName: form.fullName, province: form.province, city: form.city, address1: form.address1, postalCode: form.postalCode || undefined, country: "IR" },
        }),
      });
      setResult(data);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  const items = cart?.items ?? [];
  const s = cart?.summary ?? {};

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl">تسویه حساب</h1>

      {result ? (
        <div className="mx-auto mt-10 max-w-lg rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
          <h2 className="mt-4 font-display text-2xl">سفارش شما ثبت شد</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">شماره سفارش: <b>{result.order?.number ?? result.order?.id}</b></p>
          <p className="mt-1 text-sm leading-7 text-[var(--muted)]">برای تکمیل پرداخت (درگاه آزمایشی) روی دکمه زیر بزنید.</p>
          {result.payment?.reference ? (
            <Link href={`/checkout/sandbox?reference=${encodeURIComponent(result.payment.reference)}`} className="mt-6 inline-block rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-medium text-white transition hover:opacity-90">پرداخت آزمایشی</Link>
          ) : null}
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <h2 className="font-medium">اطلاعات ارسال</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm">ایمیل *</label>
                <input type="email" value={form.email} onChange={set("email")} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" placeholder="you@example.com" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm">نام و نام خانوادگی گیرنده *</label>
                <input value={form.fullName} onChange={set("fullName")} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-sm">استان *</label>
                <input value={form.province} onChange={set("province")} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" placeholder="تهران" />
              </div>
              <div>
                <label className="text-sm">شهر *</label>
                <input value={form.city} onChange={set("city")} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" placeholder="تهران" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm">نشانی کامل *</label>
                <input value={form.address1} onChange={set("address1")} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" placeholder="خیابان، کوچه، پلاک، واحد" />
              </div>
              <div>
                <label className="text-sm">کد پستی</label>
                <input value={form.postalCode} onChange={set("postalCode")} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm">یادداشت سفارش (اختیاری)</label>
                <textarea value={form.note} onChange={set("note")} rows={3} className="mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" />
              </div>
            </div>
            {err && <pre className="whitespace-pre-wrap rounded-xl bg-red-50 p-3 text-xs text-red-700">{err}</pre>}
          </section>

          <aside className="h-fit space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
            <h2 className="font-medium">سفارش شما</h2>
            <div className="max-h-64 space-y-3 overflow-auto">
              {items.map((i: any) => (
                <div key={i.id} className="flex justify-between gap-3 text-sm">
                  <span className="text-[var(--muted)]">{i.product?.name} × {i.quantity.toLocaleString("fa-IR")}</span>
                  <span className="flex-shrink-0">{formatPrice(i.totalPrice ?? i.unitPrice * i.quantity)}</span>
                </div>
              ))}
              {!items.length && <p className="text-sm text-[var(--muted)]">سبد خالی است.</p>}
            </div>
            <div className="space-y-2 border-t border-[var(--line)] pt-3 text-sm">
              <div className="flex justify-between"><span className="text-[var(--muted)]">جمع کل</span><span>{formatPrice(s.subtotal ?? s.total)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>پرداختی</span><span className="text-[var(--accent)]">{formatPrice(s.grandTotal ?? s.total)}</span></div>
            </div>
            <button onClick={submit} disabled={!valid || busy || !items.length}
              className="w-full rounded-full bg-[var(--accent)] py-3.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "در حال ثبت…" : "ثبت سفارش"}
            </button>
            {!valid && <p className="text-center text-xs text-[var(--muted)]">فیلدهای ستاره‌دار را کامل کنید.</p>}
          </aside>
        </div>
      )}
    </main>
  );
}
