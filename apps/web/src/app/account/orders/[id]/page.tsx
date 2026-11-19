"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatPrice, formatDate, statusFa } from "../../../../lib/format";
import { OrderStatusBadge } from "../../../../components/order-status-badge";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const RETURNABLE = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"]);

export default function MyOrderPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [err, setErr] = useState("");
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => {
    const token = localStorage.getItem("access_token");
    if (!token || !params?.id) { setErr("برای مشاهده وارد شوید."); return; }
    fetch(`${API}/my/orders/${params.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { d?.id ? setOrder(d) : setErr(d?.message || "سفارش یافت نشد"); })
      .catch(() => setErr("خطا در ارتباط با سرور"));
  };
  useEffect(load, [params?.id]);

  const submitReturn = async () => {
    const token = localStorage.getItem("access_token");
    setMsg("");
    const r = await fetch(`${API}/my/orders/${params.id}/returns`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason, ...(note ? { customerNote: note } : {}) }),
    });
    if (r.ok) { setMsg("درخواست مرجوعی ثبت شد. کارشناسان ما بررسی می‌کنند."); setReturnOpen(false); load(); }
    else setMsg("ثبت درخواست ناموفق بود.");
  };

  if (err) return <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-[var(--muted)]">{err}</main>;
  if (!order) return <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-[var(--muted)]">در حال بارگذاری…</main>;

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">جزئیات سفارش</p>
          <h1 className="mt-2 font-display text-3xl">{order.number}</h1>
          <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <OrderStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <h2 className="font-medium">کالاها</h2>
        <div className="mt-4 space-y-3">
          {order.items?.map((i: any) => (
            <div key={i.id} className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-sm last:border-0 last:pb-0">
              <span>{i.name} × {i.quantity.toLocaleString("fa-IR")}</span>
              <span className="font-medium">{formatPrice(i.totalPrice ?? i.unitPrice * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4 text-base font-semibold">
          <span>مبلغ کل</span>
          <span className="text-[var(--accent)]">{formatPrice(order.total)}</span>
        </div>
      </section>

      {order.giftWrap ? (
        <section className="mt-6 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/15 p-6">
          <h2 className="flex items-center gap-2 font-medium">🎁 بسته‌بندی هدیه</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">این سفارش در جعبه هدیه آگاهی ارسال می‌شود.</p>
          {order.giftNote ? (
            <p className="mt-3 rounded-xl border border-dashed border-[var(--line)] bg-white/70 p-3 text-sm leading-7">
              «{order.giftNote}»
            </p>
          ) : null}
        </section>
      ) : null}

      {order.shipments?.length ? (
        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <h2 className="font-medium">ارسال</h2>
          <div className="mt-3 space-y-2 text-sm">
            {order.shipments.map((s: any) => (
              <p key={s.id}>{statusFa(s.status ?? "")} — {s.carrier ?? ""} {s.trackingNumber ? <span className="text-[var(--muted)]">(کد رهگیری: {s.trackingNumber})</span> : null}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        <h2 className="font-medium">تاریخچه وضعیت</h2>
        <ol className="mt-4 space-y-4">
          {(order.statusHistory ?? []).map((h: any) => (
            <li key={h.id} className="relative pr-4">
              <span className="absolute right-0 top-1.5 h-2 w-2 rounded-full bg-[var(--accent)]" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{statusFa(h.toStatus ?? "")}</span>
                <span className="text-xs text-[var(--muted)]">{formatDate(h.createdAt)}</span>
              </div>
              {h.note ? <p className="mt-0.5 text-xs text-[var(--muted)]">{h.note}</p> : null}
            </li>
          ))}
          {!(order.statusHistory ?? []).length && <p className="text-sm text-[var(--muted)]">تاریخچه‌ای ثبت نشده است.</p>}
        </ol>
      </section>

      {RETURNABLE.has(order.status) && !order.returnRequests?.length && (
        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          {returnOpen ? (
            <div className="space-y-3">
              <h2 className="font-medium">درخواست مرجوعی</h2>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="دلیل مرجوعی (مثلاً سایز مناسب نبود)" className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" />
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="توضیحات بیشتر (اختیاری)" className="w-full rounded-xl border border-[var(--line)] bg-[var(--background)] px-3.5 py-2.5 text-sm" />
              <div className="flex gap-2">
                <button onClick={submitReturn} disabled={reason.trim().length < 3} className="rounded-full bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">ثبت درخواست</button>
                <button onClick={() => setReturnOpen(false)} className="rounded-full border border-[var(--line)] px-6 py-2.5 text-sm">انصراف</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--muted)]">اگر کالای شما مشکلی دارد می‌توانید درخواست مرجوعی ثبت کنید.</p>
              <button onClick={() => setReturnOpen(true)} className="rounded-full border border-[var(--line)] px-5 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]">ثبت درخواست مرجوعی</button>
            </div>
          )}
          {msg && <p className="mt-3 text-sm text-emerald-700">{msg}</p>}
        </section>
      )}
      {order.returnRequests?.length ? (
        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
          <h2 className="font-medium">درخواست‌های مرجوعی</h2>
          <div className="mt-3 space-y-2 text-sm">
            {order.returnRequests.map((rr: any) => (
              <p key={rr.id}>{rr.reason} — <OrderStatusBadge status={rr.status} /></p>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
