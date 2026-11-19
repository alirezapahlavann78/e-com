"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { guestFetch, guestToken, useCart } from "../../components/cart-store";
import { formatPrice } from "../../lib/format";

const PROVINCES = [
  "تهران",
  "البرز",
  "اصفهان",
  "فارس",
  "خراسان رضوی",
  "آذربایجان شرقی",
  "گیلان",
  "مازندران",
  "خوزستان",
  "یزد",
  "کرمان",
  "سایر",
];

export default function CheckoutPage() {
  const { cart, reload } = useCart();
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    phone: "",
    province: "تهران",
    city: "",
    postalCode: "",
    address1: "",
    note: "",
  });
  const [shippingMethod, setShippingMethod] = useState<"standard" | "express">("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("checkout_email") : null;
    if (stored) setForm((current) => ({ ...current, email: stored }));
  }, []);

  const items = (cart as any)?.items ?? [];
  const summary = (cart as any)?.summary ?? { subtotal: 0, discountAmount: 0, shippingAmount: 0, total: 0 };

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const valid = form.email && form.fullName && form.city && form.address1 && form.phone;

  async function submit() {
    if (!valid) {
      setError("لطفاً اطلاعات الزامی را کامل کنید.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await guestFetch<any>("/checkout", {
        method: "POST",
        body: JSON.stringify({
          guestToken: guestToken(),
          email: form.email,
          shippingMethod,
          customerNote: form.note || undefined,
          shippingAddress: {
            fullName: form.fullName,
            phone: form.phone,
            province: form.province,
            city: form.city,
            address1: form.address1,
            postalCode: form.postalCode || undefined,
            country: "ایران",
          },
        }),
      });
      localStorage.setItem("checkout_email", form.email);
      setResult(data);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت سفارش ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="shell py-20">
        <div className="mx-auto max-w-lg rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success)]/12 text-2xl text-[var(--success)]">
            ✓
          </div>
          <h1 className="display-lg mt-5">سفارش شما ثبت شد</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            شماره سفارش <b className="text-[var(--foreground)]">{result.order?.number}</b>
            <br />
            برای نهایی کردن، پرداخت را تکمیل کنید. سفارش شما ۳۰ دقیقه رزرو می‌ماند.
          </p>
          <div className="mt-4 rounded-2xl bg-[var(--background)] p-4 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">مبلغ قابل پرداخت</span>
              <span className="font-bold">{formatPrice(result.order?.total)}</span>
            </div>
          </div>
          <Link
            href={result.payment?.redirectUrl ?? `/checkout/sandbox?reference=${result.payment?.reference}`}
            className="btn btn-primary mt-7 w-full"
          >
            پرداخت آنلاین
          </Link>
          <Link href="/products" className="mt-3 block text-[11px] text-[var(--muted)]">
            ادامه خرید
          </Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="shell py-24 text-center">
        <h1 className="display-lg">سبد خرید خالی است</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">برای تسویه حساب ابتدا محصولی به سبد اضافه کنید.</p>
        <Link href="/products" className="btn btn-primary mt-7">مشاهده محصولات</Link>
      </div>
    );
  }

  const shipping =
    shippingMethod === "express" ? (summary.shippingAmount > 0 ? 149_000 : 0) : summary.shippingAmount ?? 0;
  const total = summary.subtotal - summary.discountAmount + shipping;

  return (
    <div className="shell py-10">
      <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
        <Link href="/cart" className="hover:text-[var(--foreground)]">سبد خرید</Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">تسویه حساب</span>
      </div>

      <h1 className="display-lg mt-4">تسویه حساب</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
        <div className="space-y-8">
          <section className="card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-white">۱</span>
              <h2 className="text-sm font-bold">اطلاعات تماس</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="email">ایمیل *</label>
                <input id="email" type="email" className="field" dir="ltr" value={form.email} onChange={set("email")} placeholder="you@example.com" />
              </div>
              <div>
                <label className="field-label" htmlFor="phone">شماره موبایل *</label>
                <input id="phone" className="field" dir="ltr" value={form.phone} onChange={set("phone")} placeholder="09121234567" />
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">اطلاعات سفارش و پیگیری به این ایمیل ارسال می‌شود.</p>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-white">۲</span>
              <h2 className="text-sm font-bold">آدرس تحویل</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="fullName">نام و نام خانوادگی *</label>
                <input id="fullName" className="field" value={form.fullName} onChange={set("fullName")} />
              </div>
              <div>
                <label className="field-label" htmlFor="province">استان *</label>
                <select id="province" className="field" value={form.province} onChange={set("province")}>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="city">شهر *</label>
                <input id="city" className="field" value={form.city} onChange={set("city")} />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="address1">نشانی کامل *</label>
                <input id="address1" className="field" value={form.address1} onChange={set("address1")} placeholder="خیابان، کوچه، پلاک، واحد" />
              </div>
              <div>
                <label className="field-label" htmlFor="postalCode">کد پستی</label>
                <input id="postalCode" className="field" dir="ltr" value={form.postalCode} onChange={set("postalCode")} />
              </div>
              <div>
                <label className="field-label" htmlFor="note">یادداشت سفارش</label>
                <input id="note" className="field" value={form.note} onChange={set("note")} placeholder="اختیاری" />
              </div>
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-white">۳</span>
              <h2 className="text-sm font-bold">روش ارسال</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { id: "standard" as const, title: "پست پیشتاز", price: summary.shippingAmount, time: "۲ تا ۴ روز کاری" },
                { id: "express" as const, title: "ارسال اکسپرس", price: 149_000, time: "۲۴ ساعت (تهران)" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setShippingMethod(option.id)}
                  className={`rounded-2xl border p-4 text-right transition ${
                    shippingMethod === option.id ? "border-[var(--ink)] bg-[var(--background)]" : "border-[var(--line)] hover:border-[var(--ink)]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold">{option.title}</span>
                    <span className="text-[12px]">{option.price === 0 ? "رایگان" : formatPrice(option.price)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">{option.time}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[11px] font-bold text-white">۴</span>
              <h2 className="text-sm font-bold">پرداخت</h2>
            </div>
            <div className="mt-5 rounded-2xl border border-[var(--ink)] bg-[var(--background)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold">پرداخت آنلاین</span>
                <span className="text-[11px] text-[var(--accent-strong)]">درگاه آزمایشی</span>
              </div>
              <p className="mt-1 text-[11px] leading-6 text-[var(--muted)]">
                پس از ثبت سفارش به درگاه آزمایشی منتقل می‌شوید. در محیط تولید، آداپتور درگاه بانکی (زرین‌پال / استرایپ) جایگزین می‌شود.
              </p>
            </div>
          </section>

          {error ? <p className="rounded-xl bg-[var(--danger)]/8 px-4 py-3 text-xs text-[var(--danger)]">{error}</p> : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card p-6">
            <h2 className="text-sm font-bold">سفارش شما</h2>
            <div className="mt-4 space-y-3 border-b border-[var(--line)] pb-4">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-[#ece4d6]">
                    {item.product.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.product.images[0].url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{item.product.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">
                      {item.variant?.title ? `سایز ${item.variant.title} · ` : ""}
                      {item.quantity.toLocaleString("fa-IR")} عدد
                    </p>
                  </div>
                  <span className="text-[12px]">{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between text-[var(--muted)]">
                <span>جمع کالاها</span>
                <span>{formatPrice(summary.subtotal)}</span>
              </div>
              {summary.discountAmount > 0 ? (
                <div className="flex justify-between text-[var(--success)]">
                  <span>تخفیف</span>
                  <span>−{formatPrice(summary.discountAmount)}</span>
                </div>
              ) : null}
              {(cart as any)?.giftWrap ? (
                <div className="flex justify-between text-[var(--accent-strong)]">
                  <span>بسته‌بندی هدیه</span>
                  <span>رایگان</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[var(--muted)]">
                <span>ارسال</span>
                <span>{shipping === 0 ? "رایگان" : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--line)] pt-3 text-base font-bold">
                <span>مبلغ نهایی</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {(cart as any)?.giftWrap ? (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--accent)]/50 bg-[var(--accent-soft)]/15 p-3">
                <p className="text-[11px] font-semibold text-[var(--accent-strong)]">🎁 این سفارش با بسته‌بندی هدیه ارسال می‌شود</p>
                <p className="mt-1 text-[10.5px] leading-5 text-[var(--muted)]">
                  {(cart as any)?.giftNote ? `متن کارت: «${(cart as any).giftNote}»` : "کارت هدیه بدون متن سفارشی"}
                </p>
                <Link href="/cart" className="mt-1 inline-block text-[10.5px] text-[var(--accent)] underline">
                  ویرایش در سبد خرید
                </Link>
              </div>
            ) : null}

            <button type="button" onClick={submit} disabled={busy} className="btn btn-primary mt-6 w-full">
              {busy ? "در حال ثبت سفارش…" : "ثبت سفارش و پرداخت"}
            </button>
            <p className="mt-3 text-center text-[10px] leading-6 text-[var(--muted)]">
              با ثبت سفارش، شرایط استفاده و سیاست بازگشت کالا را می‌پذیرید.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
