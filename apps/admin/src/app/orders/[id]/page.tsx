"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { adminApi } from "../../../lib/api";
import { Badge, Button, Card, Input, Label, Select, Spinner, StatusBadge, Table, TBody, TD, TH, THead, TR, Textarea } from "../../../components/ui";

interface OrderItem { id: string; name: string; sku?: string | null; variantTitle?: string | null; quantity: number; unitPrice: string; totalPrice: string; imageUrl?: string | null }
interface Payment { id: string; provider: string; status: string; amount: string; reference?: string | null; paidAt?: string | null; createdAt: string }
interface StatusHistory { id: string; fromStatus?: string | null; toStatus: string; fromPayment?: string | null; toPayment?: string | null; note?: string | null; actorEmail?: string | null; createdAt: string }
interface Note { id: string; body: string; actorEmail?: string | null; createdAt: string }
interface Shipment { id: string; carrier?: string | null; service?: string | null; trackingNumber?: string | null; status: string; shippedAt?: string | null; deliveredAt?: string | null; createdAt: string }
interface Invoice { id: string; number: string; issuedAt: string; total: string }
interface Refund { id: string; amount: string; status: string; reason?: string | null; createdAt: string }
interface ReturnRequest { id: string; status: string; reason: string; customerNote?: string | null; adminNote?: string | null; requestedAt: string; refunds: Refund[] }
interface Order {
  id: string; number: string; email: string; status: string; paymentStatus: string; currency: string;
  subtotal: string; discountAmount: string; shippingAmount: string; taxAmount: string; total: string;
  shippingAddress?: unknown; billingAddress?: unknown; customerNote?: string | null;
  createdAt: string; placedAt?: string | null;
  items: OrderItem[]; payments: Payment[]; statusHistory: StatusHistory[]; notes: Note[];
  shipments: Shipment[]; invoices: Invoice[]; returnRequests: ReturnRequest[]; refunds: Refund[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار", AWAITING_PAYMENT: "در انتظار پرداخت", PAID: "پرداخت‌شده", PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال‌شده", DELIVERED: "تحویل‌شده", CANCELLED: "لغوشده", REFUNDED: "بازپرداخت‌شده", RETURN_REQUESTED: "درخواست مرجوعی",
};
const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "در انتظار", AUTHORIZED: "تأیید اولیه", PAID: "پرداخت‌شده", FAILED: "ناموفق", REFUNDED: "بازپرداخت‌شده",
};
const SHIPMENT_LABELS: Record<string, string> = {
  PENDING: "در انتظار", PROCESSING: "در حال پردازش", SHIPPED: "ارسال‌شده", IN_TRANSIT: "در مسیر", DELIVERED: "تحویل‌شده", RETURNED: "بازگشتی",
};
const RETURN_LABELS: Record<string, string> = {
  REQUESTED: "درخواست‌شده", APPROVED: "تأییدشده", REJECTED: "ردشده", RECEIVED: "دریافت‌شده", REFUNDED: "بازپرداخت‌شده", CLOSED: "بسته‌شده",
};
const REFUND_LABELS: Record<string, string> = { PENDING: "در انتظار", APPROVED: "تأییدشده", PROCESSED: "پردازش‌شده", FAILED: "ناموفق" };

const ORDER_STATUS_OPTIONS = ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "RETURN_REQUESTED"];
const PAYMENT_STATUS_OPTIONS = ["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED"];
const SHIPMENT_STATUS_OPTIONS = ["PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "RETURNED"];

const money = (v: unknown) => `${new Intl.NumberFormat("fa-IR").format(Number(v))} تومان`;
const dateTime = (v?: string | null) => (v ? new Date(v).toLocaleDateString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : "—");

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const [statusForm, setStatusForm] = useState({ status: "", paymentStatus: "", note: "" });
  const [noteBody, setNoteBody] = useState("");
  const [shipmentForm, setShipmentForm] = useState({ carrier: "", service: "", trackingNumber: "", status: "PENDING" });
  const [refundForm, setRefundForm] = useState({ amount: "", reason: "", status: "PENDING", returnRequestId: "" });
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi<Order>(`/admin/orders/${orderId}`);
      setOrder(data);
      setStatusForm({ status: data.status, paymentStatus: data.paymentStatus, note: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت سفارش");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { void load(); }, [load]);

  const runAction = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "خطا در انجام عملیات");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Spinner /></div>;
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;
  if (!order) return null;

  const itemCount = order.items.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push("/orders")}>→ بازگشت</Button>
          <div>
            <h1 className="text-2xl font-bold" dir="ltr">{order.number}</h1>
            <p className="text-xs opacity-60">{dateTime(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus} kind="payment" />
        </div>
      </div>

      {actionError && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{actionError}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="مبلغ کل" value={money(order.total)} />
        <Kpi label="جمع اقلام" value={money(order.subtotal)} />
        <Kpi label="تخفیف" value={money(order.discountAmount)} />
        <Kpi label="تعداد اقلام" value={`${new Intl.NumberFormat("fa-IR").format(itemCount)} قلم`} />
      </div>

      {/* Items */}
      <Card>
        <h2 className="border-b p-4 font-bold">اقلام سفارش</h2>
        <Table>
          <THead><TR><TH>تصویر</TH><TH>نام</TH><TH>SKU</TH><TH>متغیر</TH><TH>تعداد</TH><TH>قیمت واحد</TH><TH>جمع</TH></TR></THead>
          <TBody>
            {order.items.map((it) => (
              <TR key={it.id}>
                <TD>
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt={it.name} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-xs opacity-50 dark:bg-white/10">—</div>
                  )}
                </TD>
                <TD className="font-medium">{it.name}</TD>
                <TD className="text-xs opacity-70" dir="ltr">{it.sku ?? "—"}</TD>
                <TD className="text-xs">{it.variantTitle ?? "—"}</TD>
                <TD>{new Intl.NumberFormat("fa-IR").format(it.quantity)}</TD>
                <TD>{money(it.unitPrice)}</TD>
                <TD>{money(it.totalPrice)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <div className="space-y-1 border-t p-4 text-sm">
          <Row label="حمل و نقل" value={money(order.shippingAmount)} />
          <Row label="مالیات" value={money(order.taxAmount)} />
          <Row label="مبلغ نهایی" value={money(order.total)} strong />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Customer */}
        <Card>
          <h2 className="border-b p-4 font-bold">مشتری</h2>
          <div className="space-y-2 p-4 text-sm">
            <Row label="ایمیل" value={order.email} />
            <Row label="تاریخ ثبت" value={dateTime(order.createdAt)} />
            <Row label="تاریخ سفارش" value={dateTime(order.placedAt)} />
            {order.customerNote && <Row label="یادداشت مشتری" value={order.customerNote} />}
            {order.payments.length > 0 && (
              <div className="pt-2">
                <p className="mb-2 font-semibold">پرداخت‌ها</p>
                <div className="space-y-2">
                  {order.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-black/5 p-2 text-xs dark:bg-[var(--panel-2)]">
                      <span dir="ltr">{p.provider}</span>
                      <StatusBadge status={p.status} kind="payment" />
                      <span>{money(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Status change */}
        <Card>
          <h2 className="border-b p-4 font-bold">تغییر وضعیت</h2>
          <form
            className="space-y-3 p-4 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void runAction(() => adminApi(`/admin/orders/${orderId}/status`, {
                method: "PATCH",
                body: JSON.stringify({
                  status: statusForm.status || undefined,
                  paymentStatus: statusForm.paymentStatus || undefined,
                  note: statusForm.note || undefined,
                }),
              }));
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>وضعیت سفارش</Label>
                <Select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
                  {ORDER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </Select>
              </div>
              <div>
                <Label>وضعیت پرداخت</Label>
                <Select value={statusForm.paymentStatus} onChange={(e) => setStatusForm({ ...statusForm, paymentStatus: e.target.value })}>
                  {PAYMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{PAYMENT_LABELS[s]}</option>)}
                </Select>
              </div>
            </div>
            <div><Label>یادداشت (اختیاری)</Label><Input value={statusForm.note} onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })} /></div>
            <div className="flex justify-end"><Button type="submit" disabled={busy}>ثبت تغییر وضعیت</Button></div>
          </form>
        </Card>

        {/* Status history timeline */}
        <Card>
          <h2 className="border-b p-4 font-bold">تاریخچه وضعیت</h2>
          <div className="p-4">
            <div className="relative space-y-4 border-s-2 ps-4">
              {order.statusHistory.map((h) => (
                <div key={h.id} className="relative">
                  <span className="absolute -start-[21px] top-1.5 h-3 w-3 rounded-full bg-indigo-500" />
                  <p className="text-sm font-medium">
                    {(h.fromStatus ? `${STATUS_LABELS[h.fromStatus] ?? h.fromStatus} ← ` : "")}{STATUS_LABELS[h.toStatus] ?? h.toStatus}
                  </p>
                  {h.fromPayment && h.toPayment && h.fromPayment !== h.toPayment && (
                    <p className="text-xs opacity-70">پرداخت: {PAYMENT_LABELS[h.fromPayment] ?? h.fromPayment} ← {PAYMENT_LABELS[h.toPayment] ?? h.toPayment}</p>
                  )}
                  {h.note && <p className="text-xs opacity-70">{h.note}</p>}
                  <p className="text-xs opacity-50">{dateTime(h.createdAt)}{h.actorEmail ? ` — ${h.actorEmail}` : ""}</p>
                </div>
              ))}
              {order.statusHistory.length === 0 && <p className="text-sm opacity-60">تاریخچه‌ای موجود نیست.</p>}
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <h2 className="border-b p-4 font-bold">یادداشت‌های داخلی</h2>
          <form
            className="space-y-3 border-b p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!noteBody.trim()) return;
              void runAction(async () => {
                await adminApi(`/admin/orders/${orderId}/notes`, { method: "POST", body: JSON.stringify({ body: noteBody }) });
                setNoteBody("");
              });
            }}
          >
            <Textarea rows={2} placeholder="یادداشت داخلی جدید…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} />
            <div className="flex justify-end"><Button type="submit" disabled={busy || !noteBody.trim()}>افزودن یادداشت</Button></div>
          </form>
          <div className="max-h-64 space-y-3 overflow-y-auto p-4">
            {order.notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-black/5 p-3 text-sm dark:bg-[var(--panel-2)]">
                <p>{n.body}</p>
                <p className="mt-1 text-xs opacity-50">{dateTime(n.createdAt)}{n.actorEmail ? ` — ${n.actorEmail}` : ""}</p>
              </div>
            ))}
            {order.notes.length === 0 && <p className="text-sm opacity-60">یادداشتی موجود نیست.</p>}
          </div>
        </Card>

        {/* Shipments */}
        <Card>
          <h2 className="border-b p-4 font-bold">ارسال‌ها</h2>
          <form
            className="space-y-3 border-b p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void runAction(async () => {
                await adminApi(`/admin/orders/${orderId}/shipments`, {
                  method: "POST",
                  body: JSON.stringify({
                    carrier: shipmentForm.carrier || undefined,
                    service: shipmentForm.service || undefined,
                    trackingNumber: shipmentForm.trackingNumber || undefined,
                    status: shipmentForm.status || undefined,
                  }),
                });
                setShipmentForm({ carrier: "", service: "", trackingNumber: "", status: "PENDING" });
              });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div><Label>حامل</Label><Input value={shipmentForm.carrier} onChange={(e) => setShipmentForm({ ...shipmentForm, carrier: e.target.value })} /></div>
              <div><Label>سرویس</Label><Input value={shipmentForm.service} onChange={(e) => setShipmentForm({ ...shipmentForm, service: e.target.value })} /></div>
              <div><Label>کد رهگیری</Label><Input dir="ltr" value={shipmentForm.trackingNumber} onChange={(e) => setShipmentForm({ ...shipmentForm, trackingNumber: e.target.value })} /></div>
              <div>
                <Label>وضعیت</Label>
                <Select value={shipmentForm.status} onChange={(e) => setShipmentForm({ ...shipmentForm, status: e.target.value })}>
                  {SHIPMENT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{SHIPMENT_LABELS[s]}</option>)}                </Select>
              </div>
            </div>
            <div className="flex justify-end"><Button type="submit" disabled={busy}>ثبت ارسال</Button></div>
          </form>
          <div className="space-y-3 p-4 text-sm">
            {order.shipments.map((s) => (
              <div key={s.id} className="rounded-lg bg-black/5 p-3 dark:bg-[var(--panel-2)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{s.carrier ?? "حامل نامشخص"}</span>
                  <StatusBadge status={s.status} />
                </div>
                <p className="mt-1 text-xs opacity-70">کد رهگیری: <span dir="ltr">{s.trackingNumber ?? "—"}</span></p>
                <p className="text-xs opacity-50">{dateTime(s.createdAt)}</p>
              </div>
            ))}
            {order.shipments.length === 0 && <p className="opacity-60">ارسالی ثبت نشده است.</p>}
          </div>
        </Card>

        {/* Returns */}
        <Card>
          <h2 className="border-b p-4 font-bold">مرجوعی‌ها</h2>
          <div className="space-y-3 p-4 text-sm">
            {order.returnRequests.map((r) => (
              <div key={r.id} className="rounded-lg bg-black/5 p-3 dark:bg-[var(--panel-2)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <StatusBadge status={r.status} kind="return" />
                  <span className="text-xs opacity-50">{dateTime(r.requestedAt)}</span>
                </div>
                <p className="mt-2">دلیل: {r.reason}</p>
                {r.customerNote && <p className="text-xs opacity-70">یادداشت مشتری: {r.customerNote}</p>}
                {r.adminNote && <p className="text-xs opacity-70">یادداشت مدیر: {r.adminNote}</p>}
                {r.refunds.length > 0 && (
                  <p className="mt-1 text-xs">بازپرداخت‌ها: {r.refunds.map((f) => `${money(f.amount)} (${REFUND_LABELS[f.status] ?? f.status})`).join("، ")}</p>
                )}
              </div>
            ))}
            {order.returnRequests.length === 0 && <p className="opacity-60">درخواست مرجوعی وجود ندارد.</p>}
          </div>
        </Card>
      </div>

      {/* Invoice + Refund */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="border-b p-4 font-bold">صورتحساب</h2>
          <div className="space-y-3 p-4 text-sm">
            {order.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg bg-black/5 p-3 dark:bg-[var(--panel-2)]">
                <span className="font-medium" dir="ltr">{inv.number}</span>
                <span>{money(inv.total)}</span>
                <span className="text-xs opacity-50">{dateTime(inv.issuedAt)}</span>
              </div>
            ))}
            {order.invoices.length === 0 && <p className="opacity-60">صورتحسابی صادر نشده است.</p>}
            {lastInvoice && (
              <p className="rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-600">
                صورتحساب جدید با شماره <span dir="ltr">{lastInvoice.number}</span> صادر شد.
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href={`/orders/${orderId}/invoice`}
                className="inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--panel-2)]"
              >
                چاپ فاکتور
              </Link>
              <Button
                disabled={busy}
                onClick={() => void runAction(async () => { setLastInvoice(await adminApi<Invoice>(`/admin/orders/${orderId}/invoice`, { method: "POST" })); })}
              >
                صدور صورتحساب
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="border-b p-4 font-bold">بازپرداخت</h2>
          <form
            className="space-y-3 p-4 text-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void runAction(async () => {
                await adminApi(`/admin/orders/${orderId}/refunds`, {
                  method: "POST",
                  body: JSON.stringify({
                    amount: Number(refundForm.amount),
                    reason: refundForm.reason || undefined,
                    status: refundForm.status || undefined,
                    returnRequestId: refundForm.returnRequestId || undefined,
                  }),
                });
                setRefundForm({ amount: "", reason: "", status: "PENDING", returnRequestId: "" });
              });
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div><Label>مبلغ (تومان) *</Label><Input required type="number" dir="ltr" value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} /></div>
              <div>
                <Label>وضعیت</Label>
                <Select value={refundForm.status} onChange={(e) => setRefundForm({ ...refundForm, status: e.target.value })}>
                  {["PENDING", "APPROVED", "PROCESSED", "FAILED"].map((s) => <option key={s} value={s}>{REFUND_LABELS[s]}</option>)}
                </Select>
              </div>
              <div><Label>دلیل</Label><Input value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} /></div>
              <div>
                <Label>مرتبط با مرجوعی</Label>
                <Select value={refundForm.returnRequestId} onChange={(e) => setRefundForm({ ...refundForm, returnRequestId: e.target.value })}>
                  <option value="">— بدون مرجوعی —</option>
                  {order.returnRequests.map((r) => <option key={r.id} value={r.id}>{RETURN_LABELS[r.status] ?? r.status} — {r.reason}</option>)}
                </Select>
              </div>
            </div>
            <div className="flex justify-end"><Button type="submit" disabled={busy || !refundForm.amount}>ثبت بازپرداخت</Button></div>
          </form>
          {order.refunds.length > 0 && (
            <div className="space-y-2 border-t p-4 text-sm">
              {order.refunds.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-lg bg-black/5 p-2 text-xs dark:bg-[var(--panel-2)]">
                  <span>{money(f.amount)}</span>
                  <StatusBadge status={f.status} kind="refund" />
                  <span className="opacity-50">{dateTime(f.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs opacity-60">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="opacity-60">{label}</span>
      <span className={strong ? "font-bold" : ""} dir={value.includes("@") ? "ltr" : undefined}>{value}</span>
    </div>
  );
}
