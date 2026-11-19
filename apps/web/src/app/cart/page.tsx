"use client";

import Link from "next/link";
import { useState } from "react";

import { guestFetch, notifyCartChanged, useCart, type Cart } from "../../components/cart-store";
import { formatPrice } from "../../lib/format";

export default function CartPage() {
  const { cart, loading, reload } = useCart();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const items = (cart as Cart | null)?.items ?? [];
  const summary = (cart as any)?.summary ?? { subtotal: 0, discountAmount: 0, shippingAmount: 0, total: 0 };
  const discount = (cart as any)?.discountCode;

  async function changeQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    setBusy(true);
    try {
      await guestFetch(`/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    setBusy(true);
    try {
      await guestFetch(`/cart/items/${itemId}`, { method: "DELETE" });
      notifyCartChanged();
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function applyCode() {
    if (!code.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await guestFetch("/cart/discount", { method: "POST", body: JSON.stringify({ code: code.trim() }) });
      setCode("");
      await reload();
      setMessage("کد تخفیف اعمال شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "کد تخفیف معتبر نیست");
    } finally {
      setBusy(false);
    }
  }

  async function removeCode() {
    setBusy(true);
    try {
      await guestFetch("/cart/discount", { method: "DELETE" });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  if (loading && !cart) {
    return <div className="shell py-24 text-center text-sm text-[var(--muted)]">در حال بارگذاری سبد…</div>;
  }

  if (!items.length) {
    return (
      <div className="shell py-24 text-center">
        <p className="eyebrow">سبد خرید</p>
        <h1 className="display-lg mt-3">سبد خرید شما خالی است</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">از کالکشن پاییز شروع کنید؛ قطعات محدود هستند.</p>
        <Link href="/products" className="btn btn-primary mt-8">مشاهده محصولات</Link>
      </div>
    );
  }

  return (
    <div className="shell py-10">
      <h1 className="display-lg">سبد خرید</h1>
      <p className="mt-2 text-xs text-[var(--muted)]">{items.length.toLocaleString("fa-IR")} قلم کالا</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
        <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {items.map((item: any) => (
            <div key={item.id} className="flex gap-4 py-5">
              <Link href={`/products/${item.product.slug}`} className="h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-[#ece4d6]">
                {item.product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product.images[0].url} alt={item.product.name} className="h-full w-full object-cover" />
                ) : null}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${item.product.slug}`} className="text-sm font-semibold hover:text-[var(--accent-strong)]">
                      {item.product.name}
                    </Link>
                    {item.variant?.title ? (
                      <p className="mt-1 text-[11px] text-[var(--muted)]">سایز: {item.variant.title}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-[11px] text-[var(--muted)] hover:text-[var(--danger)]"
                  >
                    حذف
                  </button>
                </div>

                <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                  <div className="flex h-9 items-center rounded-full border border-[var(--line)]">
                    <button
                      type="button"
                      aria-label="کاهش"
                      disabled={busy}
                      onClick={() => changeQuantity(item.id, item.quantity - 1)}
                      className="h-9 w-9 text-[var(--muted)]"
                    >
                      −
                    </button>
                    <span className="w-7 text-center text-xs font-semibold">{item.quantity.toLocaleString("fa-IR")}</span>
                    <button
                      type="button"
                      aria-label="افزایش"
                      disabled={busy}
                      onClick={() => changeQuantity(item.id, item.quantity + 1)}
                      className="h-9 w-9 text-[var(--muted)]"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(Number(item.unitPrice) * item.quantity)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="card p-6">
            <h2 className="text-sm font-bold">خلاصه سفارش</h2>

            <div className="mt-5 space-y-3 text-[13px]">
              <div className="flex justify-between text-[var(--muted)]">
                <span>جمع کالاها</span>
                <span>{formatPrice(summary.subtotal)}</span>
              </div>
              {summary.discountAmount > 0 ? (
                <div className="flex justify-between text-[var(--success)]">
                  <span>تخفیف {discount?.code ? `(${discount.code})` : ""}</span>
                  <span>−{formatPrice(summary.discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-[var(--muted)]">
                <span>هزینه ارسال</span>
                <span>{summary.shippingAmount > 0 ? formatPrice(summary.shippingAmount) : "رایگان"}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--line)] pt-3 text-base font-bold">
                <span>مبلغ قابل پرداخت</span>
                <span>{formatPrice(summary.total)}</span>
              </div>
            </div>

            {summary.shippingAmount > 0 && summary.freeShippingRemaining > 0 ? (
              <div className="mt-5 rounded-xl bg-[var(--accent-soft)]/15 p-3">
                <p className="text-[11px] text-[var(--accent-strong)]">
                  {formatPrice(summary.freeShippingRemaining)} تا ارسال رایگان
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${Math.min(100, (summary.subtotal / (summary.subtotal + summary.freeShippingRemaining)) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-5">
              {discount ? (
                <div className="flex items-center justify-between rounded-xl border border-dashed border-[var(--line)] px-3 py-2.5">
                  <span className="text-xs font-semibold text-[var(--accent-strong)]">{discount.code}</span>
                  <button type="button" onClick={removeCode} className="text-[11px] text-[var(--muted)] hover:text-[var(--danger)]">
                    حذف
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="field py-2.5 text-xs"
                    placeholder="کد تخفیف (مثلاً WELCOME10)"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                  <button type="button" onClick={applyCode} disabled={busy} className="btn btn-outline px-4 py-2.5 text-xs">
                    اعمال
                  </button>
                </div>
              )}
              {message ? <p className="mt-2 text-[11px] text-[var(--accent-strong)]">{message}</p> : null}
            </div>

            <Link href="/checkout" className="btn btn-primary mt-6 w-full">
              ادامه فرآیند خرید
            </Link>
            <Link href="/products" className="mt-3 block text-center text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]">
              ادامه خرید
            </Link>
          </div>

          <div className="mt-4 space-y-2 text-[11px] text-[var(--muted)]">
            <p>✦ پرداخت امن از طریق درگاه بانکی</p>
            <p>✦ امکان بازگشت کالا تا ۷ روز</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
