"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { adminApi, adminToken, faMoney, faNum } from "../../lib/api";
import { Button, Card, CardHeader, EmptyState, Input, Label, Select, Spinner, Table, TBody, TD, TH, THead, TR } from "../../components/ui";

type SalesReport = {
  range: { from: string; to: string };
  totals: {
    revenue: number;
    paidOrders: number;
    orders: number;
    averageOrderValue: number;
    refunds: number;
    refundCount: number;
    newCustomers: number;
    shipping: number;
    discount: number;
    tax: number;
    shipped: number;
    cancelled: number;
  };
  days: { date: string; revenue: number; orders: number }[];
  byStatus: Record<string, number>;
  byPayment: Record<string, number>;
  topProducts: { name: string; revenue: number; quantity: number }[];
  topCustomers: { email: string; revenue: number; orders: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  AWAITING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغو‌شده",
  COMPLETED: "تکمیل‌شده",
  REFUNDED: "بازپرداخت",
  RETURN_REQUESTED: "مرجوعی",
};

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  AUTHORIZED: "تأیید موقت",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت",
  PARTIALLY_REFUNDED: "بازپرداخت جزئی",
};

const iso = (date: Date) => date.toISOString().slice(0, 10);

export default function ReportsPage() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 29 * 86_400_000)));
  const [to, setTo] = useState(() => iso(today));
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await adminApi<SalesReport>(`/admin/reports/sales?from=${from}&to=${to}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در دریافت گزارش");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  function preset(days: number) {
    setFrom(iso(new Date(Date.now() - (days - 1) * 86_400_000)));
    setTo(iso(new Date()));
  }

  async function exportCsv(dataset: string) {
    setExporting(dataset);
    setError("");
    try {
      const response = await fetch(`/api/admin/reports/export?dataset=${dataset}&from=${from}&to=${to}`, {
        headers: adminToken() ? { Authorization: `Bearer ${adminToken()}` } : {},
        cache: "no-store",
      });
      if (!response.ok) throw new Error("دریافت فایل ناموفق بود");
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? `${dataset}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خروجی CSV ناموفق بود");
    } finally {
      setExporting("");
    }
  }

  const peak = Math.max(1, ...(data?.days ?? []).map((day) => day.revenue));
  const statusTotal = Object.values(data?.byStatus ?? {}).reduce((sum, value) => sum + value, 0) || 1;
  const paymentTotal = Object.values(data?.byPayment ?? {}).reduce((sum, value) => sum + value, 0) || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">گزارش‌ها</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">فروش، محصولات پرفروش و مشتریان وفادار در یک نگاه — خروجی CSV برای اکسل.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="from" className="text-[10px]">از</Label>
            <Input id="from" type="date" dir="ltr" value={from} onChange={(event) => setFrom(event.target.value)} className="w-36" />
          </div>
          <div>
            <Label htmlFor="to" className="text-[10px]">تا</Label>
            <Input id="to" type="date" dir="ltr" value={to} onChange={(event) => setTo(event.target.value)} className="w-36" />
          </div>
          <Button variant="outline" onClick={() => preset(7)}>۷ روز</Button>
          <Button variant="outline" onClick={() => preset(30)}>۳۰ روز</Button>
          <Button variant="outline" onClick={() => preset(90)}>۹۰ روز</Button>
          <Button onClick={() => void load()} disabled={loading}>اعمال</Button>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-[var(--danger)]/10 px-3 py-2 text-[12px] text-[var(--danger)]">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center p-16"><Spinner className="h-8 w-8" /></div>
      ) : !data ? (
        <EmptyState title="گزارشی برای این بازه نیست" description="بازه تاریخ را تغییر دهید." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-4">
              <p className="text-[11px] text-[var(--muted)]">درآمد پرداخت‌شده</p>
              <p className="mt-2 text-2xl font-bold">{faMoney(data.totals.revenue)}</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{faNum(data.totals.paidOrders)} سفارش پرداخت‌شده</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-[var(--muted)]">میانگین سبد</p>
              <p className="mt-2 text-2xl font-bold">{faMoney(data.totals.averageOrderValue)}</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{faNum(data.totals.orders)} سفارش ثبت‌شده</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-[var(--muted)]">مشتریان جدید</p>
              <p className="mt-2 text-2xl font-bold">{faNum(data.totals.newCustomers)}</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{faNum(data.totals.shipped)} سفارش ارسال/تحویل</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-[var(--muted)]">بازپرداخت</p>
              <p className="mt-2 text-2xl font-bold text-[var(--danger)]">{faMoney(data.totals.refunds)}</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{faNum(data.totals.refundCount)} مورد · {faNum(data.totals.cancelled)} لغو</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="روند فروش روزانه"
              subtitle={`${faNum(data.days.length)} روز · تخفیف ${faMoney(data.totals.discount)} · ارسال ${faMoney(data.totals.shipping)}`}
              action={
                <div className="flex flex-wrap gap-1">
                  {([
                    ["orders", "سفارش‌ها"],
                    ["products", "محصولات"],
                    ["customers", "مشتریان"],
                    ["inventory", "موجودی"],
                  ] as [string, string][]).map(([key, label]) => (
                    <Button key={key} variant="ghost" className="px-2 py-1 text-[11px]" disabled={exporting === key} onClick={() => void exportCsv(key)}>
                      {exporting === key ? "…" : `CSV ${label}`}
                    </Button>
                  ))}
                </div>
              }
            />
            <div className="p-5">
              <div className="flex h-40 items-end gap-[3px]">
                {data.days.map((day) => (
                  <div key={day.date} className="group relative flex-1" title={`${day.date} — ${faMoney(day.revenue)} (${day.orders} سفارش)`}>
                    <div
                      className="w-full rounded-t bg-[var(--accent)]/70 transition group-hover:bg-[var(--accent)]"
                      style={{ height: `${Math.max(2, (day.revenue / peak) * 150)}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[var(--muted)]">
                <span dir="ltr">{data.days[0]?.date}</span>
                <span dir="ltr">{data.days[data.days.length - 1]?.date}</span>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="سفارش‌ها بر اساس وضعیت" />
              <div className="space-y-3 p-5">
                {Object.entries(data.byStatus).length === 0 ? <p className="text-[12px] text-[var(--muted)]">سفارشی در این بازه نیست.</p> : null}
                {Object.entries(data.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status}>
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span>{STATUS_LABEL[status] ?? status}</span>
                        <span className="text-[var(--muted)]">{faNum(count)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--border)]">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(count / statusTotal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="وضعیت پرداخت" />
              <div className="space-y-3 p-5">
                {Object.entries(data.byPayment).length === 0 ? <p className="text-[12px] text-[var(--muted)]">داده‌ای نیست.</p> : null}
                {Object.entries(data.byPayment)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <div key={status}>
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span>{PAYMENT_LABEL[status] ?? status}</span>
                        <span className="text-[var(--muted)]">{faNum(count)}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--border)]">
                        <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${(count / paymentTotal) * 100}%` }} />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="پرفروش‌ترین محصولات" subtitle="بر اساس مبلغ فروش پرداخت‌شده" />
              {data.topProducts.length === 0 ? (
                <EmptyState title="فروشی ثبت نشده" />
              ) : (
                <Table>
                  <THead><TR><TH>محصول</TH><TH>تعداد</TH><TH>درآمد</TH></TR></THead>
                  <TBody>
                    {data.topProducts.map((product) => (
                      <TR key={product.name}>
                        <TD className="text-[12px]">{product.name}</TD>
                        <TD>{faNum(product.quantity)}</TD>
                        <TD>{faMoney(product.revenue)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>

            <Card>
              <CardHeader title="مشتریان برتر" subtitle="بیشترین مبلغ خرید در بازه" />
              {data.topCustomers.length === 0 ? (
                <EmptyState title="خریدی ثبت نشده" />
              ) : (
                <Table>
                  <THead><TR><TH>ایمیل</TH><TH>سفارش</TH><TH>مبلغ</TH></TR></THead>
                  <TBody>
                    {data.topCustomers.map((customer) => (
                      <TR key={customer.email}>
                        <TD dir="ltr" className="text-[11.5px]">{customer.email}</TD>
                        <TD>{faNum(customer.orders)}</TD>
                        <TD>{faMoney(customer.revenue)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
