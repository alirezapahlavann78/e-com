"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { adminApi, faDate, faMoney, faNum } from "../lib/api";
import { Badge, Card, EmptyState, Spinner, StatusBadge } from "../components/ui";

type Stats = {
  revenueToday: number;
  revenue30d: number;
  orders30d: number;
  averageOrderValue: number;
  revenue14d: { date: string; revenue: number }[];
  ordersToday: number;
  ordersByStatus: Record<string, number>;
  totalCustomers: number;
  totalProducts: number;
  recentOrders: {
    id: string;
    number: string;
    email: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: string;
    customerName: string | null;
  }[];
  lowStock: { id: string; sku: string; name: string; stockQuantity: number }[];
  topProducts: { name: string; revenue: number; quantity: number }[];
};

function AreaChart({ data }: { data: { label: string; value: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;
  const height = 220;
  const padY = 18;
  const innerH = height - padY * 2;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = width / Math.max(1, data.length - 1);

  const points = data.map((d, i) => ({ x: i * step, y: padY + innerH - (d.value / max) * innerH }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="نمودار درآمد">
        <defs>
          <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={width} y1={padY + innerH * (1 - f)} y2={padY + innerH * (1 - f)} stroke="var(--border)" strokeDasharray="3 5" />
        ))}
        <path d={area} fill="url(#revenueFill)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={hover === i ? 5 : 2.6} fill="var(--panel)" stroke="var(--accent)" strokeWidth="2" />
            <rect
              x={p.x - step / 2}
              y={0}
              width={step}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          </g>
        ))}
      </svg>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: `${(points[hover]!.x / width) * 100}%`, top: 0 }}
        >
          <p className="text-[var(--muted)]">{data[hover]!.label}</p>
          <p className="font-semibold">{faMoney(data[hover]!.value)}</p>
        </div>
      ) : null}
      <div className="mt-2 flex justify-between text-[10px] text-[var(--muted)]">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: "neutral" | "up" | "down" }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent),transparent)] opacity-60" />
      <p className="text-[11px] font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2.5 text-[26px] font-bold leading-none tracking-tight">{value}</p>
      {hint ? (
        <p className={`mt-2 inline-flex items-center gap-1 text-[11px] ${tone === "up" ? "text-[var(--success)]" : tone === "down" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
          {hint}
        </p>
      ) : null}
    </Card>
  );
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  AWAITING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغو‌شده",
  REFUNDED: "مرجوع",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi<Stats>("/admin/stats")
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  const chartData = useMemo(
    () =>
      (stats?.revenue14d ?? []).map((d) => ({
        label: new Date(d.date).toLocaleDateString("fa-IR", { day: "numeric", month: "short" }),
        value: d.revenue,
      })),
    [stats],
  );

  const statusRows = useMemo(() => {
    const entries = Object.entries(stats?.ordersByStatus ?? {}).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
    return entries.map(([status, count]) => ({ status, count, percent: Math.round((count / total) * 100) }));
  }, [stats]);

  if (error) {
    return (
      <Card className="p-6 text-sm">
        <p className="font-semibold text-[var(--danger)]">دریافت آمار ناموفق بود</p>
        <p className="mt-2 text-[var(--muted)]">{error}</p>
      </Card>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="فروش امروز" value={faMoney(stats.revenueToday)} hint={`${faNum(stats.ordersToday)} سفارش امروز`} />
        <Kpi label="فروش ۳۰ روز" value={faMoney(stats.revenue30d)} hint={`${faNum(stats.orders30d)} سفارش پرداخت‌شده`} tone="up" />
        <Kpi label="میانگین سبد خرید" value={faMoney(stats.averageOrderValue)} hint="بر پایه سفارش‌های پرداخت‌شده" />
        <Kpi label="مشتریان / محصولات" value={`${faNum(stats.totalCustomers)} / ${faNum(stats.totalProducts)}`} hint="کل رکوردهای فعال" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="card-title">روند فروش ۱۴ روز گذشته</h2>
              <p className="mt-1 text-[11px] text-[var(--muted)]">مجموع مبلغ سفارش‌های ثبت‌شده در هر روز</p>
            </div>
            <span className="rounded-full bg-[var(--panel-2)] px-3 py-1 text-[11px] text-[var(--muted)]">تومان</span>
          </div>
          <AreaChart data={chartData} />
        </Card>

        <Card className="p-5">
          <h2 className="card-title">وضعیت سفارش‌ها</h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">توزیع کل سفارش‌های ثبت‌شده</p>
          <div className="mt-5 space-y-3.5">
            {statusRows.length === 0 ? <p className="text-xs text-[var(--muted)]">سفارشی ثبت نشده است.</p> : null}
            {statusRows.map((row) => (
              <div key={row.status}>
                <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
                  <span className="text-[var(--muted)]">{STATUS_LABELS[row.status] ?? row.status}</span>
                  <span className="font-semibold">{faNum(row.count)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-2)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(4, row.percent)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <h2 className="card-title">آخرین سفارش‌ها</h2>
            <Link href="/orders" className="text-[11.5px] text-[var(--accent)] hover:underline">
              همه سفارش‌ها
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {stats.recentOrders.length === 0 ? (
              <div className="p-5">
                <EmptyState title="هنوز سفارشی ندارید" description="پس از ثبت اولین سفارش اینجا نمایش داده می‌شود." />
              </div>
            ) : null}
            {stats.recentOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-[var(--panel-2)]">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold" dir="ltr">
                    #{order.number}
                  </p>
                  <p className="truncate text-[11px] text-[var(--muted)]">{order.customerName || order.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden text-[11px] text-[var(--muted)] sm:block">{faDate(order.createdAt)}</span>
                  <StatusBadge status={order.status} />
                  <span className="w-24 text-left text-[11.5px] font-semibold">{faMoney(order.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="card-title">پرفروش‌ترین محصولات</h2>
            <div className="mt-4 space-y-3">
              {stats.topProducts.length === 0 ? <p className="text-xs text-[var(--muted)]">داده‌ای موجود نیست.</p> : null}
              {stats.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--panel-2)] text-[10px] font-bold text-[var(--muted)]">
                    {faNum(index + 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{product.name}</p>
                    <p className="text-[10.5px] text-[var(--muted)]">{faNum(product.quantity)} عدد</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-[var(--accent)]">{faMoney(product.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="card-title">هشدار موجودی</h2>
              <Link href="/inventory" className="text-[11.5px] text-[var(--accent)] hover:underline">
                مدیریت
              </Link>
            </div>
            <div className="mt-4 space-y-2.5">
              {stats.lowStock.length === 0 ? <p className="text-xs text-[var(--muted)]">موجودی همه اقلام مناسب است.</p> : null}
              {stats.lowStock.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="truncate text-[var(--muted)]">{item.name}</span>
                  <Badge variant={item.stockQuantity === 0 ? "danger" : "warn"}>{faNum(item.stockQuantity)} عدد</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
