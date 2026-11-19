"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "../../lib/api";
import { Badge, Card, Input, Pagination, Select, Spinner, StatusBadge, Table, TBody, TD, TH, THead, TR } from "../../components/ui";

interface OrderItem { id: string; name: string; quantity: number }
interface Order {
  id: string; number: string; email: string; status: string; paymentStatus: string;
  total: string; createdAt: string; items: OrderItem[]; _count?: { returnRequests?: number };
}
interface ListResponse { items: Order[]; total: number; page: number; limit: number }

const ORDER_STATUSES = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "PENDING", label: "در انتظار" },
  { value: "AWAITING_PAYMENT", label: "در انتظار پرداخت" },
  { value: "PAID", label: "پرداخت‌شده" },
  { value: "PROCESSING", label: "در حال پردازش" },
  { value: "SHIPPED", label: "ارسال‌شده" },
  { value: "DELIVERED", label: "تحویل‌شده" },
  { value: "CANCELLED", label: "لغوشده" },
  { value: "REFUNDED", label: "بازپرداخت‌شده" },
  { value: "RETURN_REQUESTED", label: "درخواست مرجوعی" },
];

const PAYMENT_STATUSES = [
  { value: "", label: "همه وضعیت‌های پرداخت" },
  { value: "PENDING", label: "در انتظار" },
  { value: "AUTHORIZED", label: "تأیید اولیه" },
  { value: "PAID", label: "پرداخت‌شده" },
  { value: "FAILED", label: "ناموفق" },
  { value: "REFUNDED", label: "بازپرداخت‌شده" },
];

const money = (v: unknown) => `${new Intl.NumberFormat("fa-IR").format(Number(v))} تومان`;

export default function OrdersPage() {
  const router = useRouter();
  const [items, setItems] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (q.trim()) params.set("q", q.trim());
      const data = await adminApi<ListResponse>(`/admin/orders?${params.toString()}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت سفارش‌ها");
    } finally {
      setLoading(false);
    }
  }, [page, status, paymentStatus, q]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">سفارش‌ها</h1>
        <p className="text-sm opacity-60">{new Intl.NumberFormat("fa-IR").format(total)} سفارش</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b p-3">
          <div className="w-full sm:w-44">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <Select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}>
              {PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-64">
            <Input placeholder="جستجو: شماره سفارش یا ایمیل…" value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>شماره سفارش</TH><TH>مشتری</TH><TH>مبلغ</TH><TH>اقلام</TH><TH>وضعیت پرداخت</TH><TH>وضعیت</TH><TH>تاریخ</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((o) => (
                  <TR key={o.id} className="cursor-pointer" onClick={() => router.push(`/orders/${o.id}`)}>
                    <TD className="font-medium" dir="ltr">{o.number}</TD>
                    <TD className="text-xs" dir="ltr">{o.email}</TD>
                    <TD>{money(o.total)}</TD>
                    <TD>
                      <Badge variant="info">{new Intl.NumberFormat("fa-IR").format(o.items?.length ?? 0)} قلم</Badge>
                      {o._count?.returnRequests ? <Badge variant="warn">{new Intl.NumberFormat("fa-IR").format(o._count.returnRequests)} مرجوعی</Badge> : null}
                    </TD>
                    <TD><StatusBadge status={o.paymentStatus} kind="payment" /></TD>
                    <TD><StatusBadge status={o.status} /></TD>
                    <TD className="text-xs opacity-70">{new Date(o.createdAt).toLocaleDateString("fa-IR")}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            {items.length === 0 && <div className="p-10 text-center text-sm opacity-60">سفارشی یافت نشد.</div>}
          </>
        )}

        {total > limit && (
          <div className="border-t p-3">
            <Pagination page={page} limit={limit} total={total} onPage={setPage} />
          </div>
        )}
      </Card>
    </div>
  );
}
