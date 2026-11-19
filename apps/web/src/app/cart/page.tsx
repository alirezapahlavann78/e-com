"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { guestFetch } from "../../components/cart-store";
import { formatPrice } from "../../lib/format";

export default function CartPage() {
  const [cart, setCart] = useState<any>(null);
  const [err, setErr] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => { try { setErr(""); setCart(await guestFetch("/cart")); } catch (e: any) { setErr(e.message); } };
  useEffect(() => { load(); }, []);

  const setQty = async (id: string, quantity: number) => {
    if (quantity < 1) return;
    setBusy(true);
    try { setCart(await guestFetch(`/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) })); } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => { try { setCart(await guestFetch(`/cart/items/${id}`, { method: "DELETE" })); } catch (e: any) { setErr(e.message); } };
  const applyDiscount = async () => { try { setErr(""); setCart(await guestFetch("/cart/discount", { method: "POST", body: JSON.stringify({ code }) })); } catch (e: any) { setErr(e.message); } };
  const removeDiscount = async () => { try { setErr(""); setCart(await guestFetch("/cart/discount", { method: "DELETE" })); setCode(""); } catch (e: any) { setErr(e.message); } };

  if (!cart) return <main className="mx-auto max-w-4xl px-6 py-12 text-[var(--muted)]">{err ? `خطا: ${err}` : "در حال بارگذاری…"}</main>;

  const s = cart.summary ?? {};
  const items = cart.items ?? [];

  if (!items.length) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl">سبد خرید شما خالی است</h1>
        <p className="mt-4 text-[var(--muted)]">هنوز محصولی انتخاب نکرده‌اید.</p>
        <Link href="/products" className="mt-8 inline-block rounded-full bg-[var(--accent)] px-8 py-3.5 text-sm font-medium text-white transition hover:opacity-90">مشاهده محصولات</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-4xl">سبد خرید</h1>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((i: any) => (
            <div key={i.id} className="flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <Link href={`/products/${i.product?.slug}`} className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-[#efe9df]">
                {i.product?.images?.[0]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={i.product.images[0].url} alt={i.product.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-xs text-[var(--muted)]">AGHACI</div>}
              </Link>
              <div className="flex-1">
                <Link href={`/products/${i.product?.slug}`} className="font-medium link-underline">{i.product?.name}</Link>
                <p className="mt-1 text-sm text-[var(--muted)]">{formatPrice(i.unitPrice)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(i.id, i.quantity - 1)} disabled={busy || i.quantity <= 1} className="h-9 w-9 rounded-full border border-[var(--line)] text-lg leading-none transition hover:border-[var(--accent)] disabled:opacity-40">−</button>
                <span className="w-8 text-center text-sm">{i.quantity.toLocaleString("fa-IR")}</span>
                <button onClick={() => setQty(i.id, i.quantity + 1)} disabled={busy} className="h-9 w-9 rounded-full border border-[var(--line)] text-lg leading-none transition hover:border-[var(--accent)] disabled:opacity-40">+</button>
              </div>
              <div className="w-28 text-left text-sm font-semibold">{formatPrice(i.totalPrice ?? i.unitPrice * i.quantity)}</div>
              <button onClick={() => remove(i.id)} className="text-sm text-red-700 transition hover:opacity-70" aria-label="حذف">✕</button>
            </div>
          ))}
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <h2 className="font-medium">خلاصه سفارش</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted)]">جمع کل</span><span>{formatPrice(s.subtotal ?? s.total)}</span></div>
            {s.discountAmount != null && Number(s.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-700"><span>تخفیف</span><span>−{formatPrice(s.discountAmount)}</span></div>
            )}
            {(s.shippingAmount != null && Number(s.shippingAmount) > 0) && (
              <div className="flex justify-between"><span className="text-[var(--muted)]">ارسال</span><span>{formatPrice(s.shippingAmount)}</span></div>
            )}
            <div className="flex justify-between border-t border-[var(--line)] pt-3 text-base font-semibold"><span>پرداختی</span><span className="text-[var(--accent)]">{formatPrice(s.grandTotal ?? s.total)}</span></div>
          </div>

          <div className="border-t border-[var(--line)] pt-4">
            {cart.discountCode ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
                <span>کد فعال: {cart.discountCode.code}</span>
                <button onClick={removeDiscount} className="text-red-700 hover:opacity-70">حذف</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="کد تخفیف" className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" />
                <button onClick={applyDiscount} className="rounded-xl border border-[var(--line)] px-4 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]">اعمال</button>
              </div>
            )}
            {s.discountError && <p className="mt-2 text-xs text-amber-700">{s.discountError}</p>}
          </div>

          {err && <p className="text-xs text-red-700">{err}</p>}

          <Link href="/checkout" className="block rounded-full bg-[var(--accent)] py-3.5 text-center text-sm font-medium text-white transition hover:opacity-90">ادامه فرآیند خرید</Link>
        </aside>
      </div>
    </main>
  );
}
