"use client";
import { useEffect, useState } from "react";
import { adminApi } from "../lib/api";
import { Card, CardHeader, Badge, StatusBadge, Table, THead, TBody, TR, TH, TD, Spinner, EmptyState } from "../components/ui";
import { BarChart } from "../components/charts";

type Stats = {
  revenueToday: number;
  revenue14d: { date: string; revenue: number }[];
  ordersToday: number;
  ordersByStatus: Record<string, number>;
  totalCustomers: number;
  totalProducts: number;
  recentOrders: { id: string; number: string; email: string; status: string; paymentStatus: string; total: number; createdAt: string; customerName: string | null }[];
  lowStock: { id: string; sku: string; name: string; stockQuantity: number }[];
};

const faNum = (n: number) => n.toLocaleString("fa-IR");
const faMoney = (n: number) => `${Math.round(n).toLocaleString("fa-IR")} تومان`;
const faDate = (d: string) => { try { return new Date(d).toLocaleDateString("fa-IR"); } catch { return d; } };

function StatCard({ title, value, hint, loading }: { title: string; value: string; hint?: string; loading?: boolean }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-[var(--muted)]">{title}</p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-[var(--panel-2)]" />
      ) : (
        <p className="mt-2 text-2xl font-bold text-[var(--foreground)]">{value}</p>
      )}
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    adminApi<Stats>("/admin/stats")
      .then((s) => { if (alive) setStats(s); })
      .catch(() => { if (alive) setError("دریافت آمار ناموفق بود. ممکن است دسترسی یا سرویس آمار در دسترس نباشد."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const chartData = (stats?.revenue14d ?? []).map((d) => ({
    label: new Date(d.date).toLocaleDateString("fa-IR", { day: "numeric", month: "short" }),
    value: d.revenue,
  }));

  return (
    <div className="space-y-6">
      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="درآمد امروز" value={stats ? faMoney(stats.revenueToday) : "۰"} loading={loading} hint="مجموع سفارش‌های امروز" />
        <StatCard title="سفارش‌های امروز" value={stats ? faNum(stats.ordersToday) : "۰"} loading={loading} />
        <StatCard title="مشتریان" value={stats ? faNum(stats.totalCustomers) : "۰"} loading={loading} hint="کل کاربران ثبت‌شده" />
        <StatCard title="محصولات" value={stats ? faNum(stats.totalProducts) : "۰"} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="درآمد ۱۴ روز گذشته" subtitle="مجموع فروش روزانه (تومان)" />
          <div className="p-4">
            {loading ? (
              <div className="flex h-52 items-center justify-center"><Spinner className="h-7 w-7" /></div>
            ) : chartData.length === 0 ? (
              <EmptyState title="داده‌ای برای نمایش نیست" description="در ۱۴ روز گذشته فروشی ثبت نشده است." />
            ) : (
              <BarChart data={chartData} formatValue={faMoney} />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="موجودی کم" subtitle="محصولات و متغیرهای با موجودی ۵ یا کمتر" />
          <div className="p-2">
            {loading ? (
              <div className="flex h-52 items-center justify-center"><Spinner className="h-7 w-7" /></div>
            ) : !stats || stats.lowStock.length === 0 ? (
              <EmptyState title="موجودی کم ندارید" />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {stats.lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">{p.name}</p>
                      <p className="text-xs text-[var(--muted)]" dir="ltr">{p.sku}</p>
                    </div>
                    <Badge variant={p.stockQuantity === 0 ? "danger" : "warn"}>{faNum(p.stockQuantity)} عدد</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="سفارش‌های اخیر" subtitle="۵ سفارش آخر" />
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Spinner className="h-7 w-7" /></div>
        ) : !stats || stats.recentOrders.length === 0 ? (
          <EmptyState title="هنوز سفارشی ثبت نشده است" />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>شماره سفارش</TH>
                  <TH>مشتری</TH>
                  <TH>وضعیت</TH>
                  <TH>وضعیت پرداخت</TH>
                  <TH>مبلغ</TH>
                  <TH>تاریخ</TH>
                </TR>
              </THead>
              <TBody>
                {stats.recentOrders.map((o) => (
                  <TR key={o.id}>
                    <TD className="font-medium" dir="ltr">{o.number}</TD>
                    <TD>{o.customerName ?? o.email}</TD>
                    <TD><StatusBadge status={o.status} kind="order" /></TD>
                    <TD><StatusBadge status={o.paymentStatus} kind="payment" /></TD>
                    <TD>{faMoney(Number(o.total))}</TD>
                    <TD className="text-[var(--muted)]">{faDate(o.createdAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </>
        )}
      </Card>
    </div>
  );
}
