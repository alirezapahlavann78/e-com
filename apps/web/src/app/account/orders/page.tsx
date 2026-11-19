"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice, formatDate, statusFa } from "../../../lib/format";
import { OrderStatusBadge } from "../../../components/order-status-badge";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setErr("برای مشاهده سفارش‌ها وارد شوید."); return; }
    fetch(`${API}/my/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { Array.isArray(d) ? setOrders(d) : setErr(d?.message || "خطا در دریافت سفارش‌ها"); })
      .catch(() => setErr("خطا در ارتباط با سرور"));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="eyebrow">حساب کاربری</p>
      <h1 className="mt-2 font-display text-4xl">سفارش‌های من</h1>

      {err && <p className="mt-8 rounded-2xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">{err}</p>}

      <div className="mt-8 space-y-4">
        {orders.map((o) => (
          <Link key={o.id} href={`/account/orders/${o.id}`} className="card-hover block rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{o.number}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(o.createdAt)} — {(o.items?.length ?? 0).toLocaleString("fa-IR")} کالا</p>
              </div>
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={o.status} />
                <span className="text-sm font-semibold text-[var(--accent)]">{formatPrice(o.total)}</span>
              </div>
            </div>
          </Link>
        ))}
        {!err && !orders.length && <p className="rounded-2xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-[var(--muted)]">سفارشی ثبت نکرده‌اید.</p>}
      </div>
    </main>
  );
}
