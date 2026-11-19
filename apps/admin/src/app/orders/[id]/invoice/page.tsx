"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { adminApi, faDate, faMoney, faNum } from "../../../../lib/api";
import { Button, Spinner } from "../../../../components/ui";

type InvoicePayload = {
  order: {
    id: string;
    number: string;
    email: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
    subtotal: string;
    discountAmount: string;
    shippingAmount: string;
    taxAmount: string;
    total: string;
    customerNote: string | null;
    shippingAddress: Record<string, unknown> | null;
    items: { id: string; name: string; sku: string | null; quantity: number; unitPrice: string; totalPrice: string }[];
    user: { firstName: string | null; lastName: string | null; phone: string | null; email: string } | null;
  };
  invoice: { id: string; number: string; issuedAt: string; total: string };
  store: Record<string, string>;
};

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .invoice-print, .invoice-print * { visibility: visible !important; }
  .invoice-print { position: absolute !important; inset: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; width: 100% !important; max-width: none !important; border-radius: 0 !important; }
  .no-print { display: none !important; }
  @page { size: A4; margin: 12mm; }
}
`;

function addressLines(address: Record<string, unknown> | null) {
  if (!address) return [] as string[];
  const pick = (...keys: string[]) => keys.map((key) => address[key]).find((value) => typeof value === "string" && value.trim());
  const lines: string[] = [];
  const name = pick("fullName", "receiver", "name");
  const phone = pick("phone", "mobile");
  const province = pick("province", "state");
  const city = pick("city");
  const line1 = pick("line1", "address1", "address", "street");
  const line2 = pick("line2", "address2");
  const postal = pick("postalCode", "zip", "postcode");
  if (name) lines.push(String(name));
  if (phone) lines.push(`تلفن: ${phone}`);
  if (province || city) lines.push([province, city].filter(Boolean).join("، "));
  if (line1) lines.push(String(line1));
  if (line2) lines.push(String(line2));
  if (postal) lines.push(`کد پستی: ${postal}`);
  return lines;
}

export default function InvoicePrintPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id as string;
  const [data, setData] = useState<InvoicePayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) return;
    adminApi<InvoicePayload>(`/admin/orders/${orderId}/invoice-data`)
      .then(setData)
      .catch((cause: Error) => setError(cause.message));
  }, [orderId]);

  if (error) {
    return (
      <div className="rounded-xl bg-[var(--danger)]/10 p-4 text-sm text-[var(--danger)]">
        خطا در دریافت صورتحساب: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center p-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const { order, invoice, store } = data;
  const storeName = store["store.name"] || "آگاهی";
  const address = addressLines(order.shippingAddress);
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">صورتحساب {invoice.number}</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">پیش‌نمایش چاپ A4 — با Ctrl+P یا دکمه چاپ، فایل PDF ذخیره کنید.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/orders/${order.id}`} className="inline-flex items-center rounded-lg px-4 py-2 text-sm hover:bg-[var(--panel-2)]">
            بازگشت به سفارش
          </Link>
          <Button onClick={() => window.print()}>چاپ / ذخیره PDF</Button>
        </div>
      </div>

      <div className="invoice-print mx-auto w-full max-w-[820px] rounded-xl border border-[var(--border)] bg-white p-8 text-[#1a1a1a] shadow-sm">
        <header className="flex items-start justify-between gap-4 border-b border-[#e2ddd4] pb-5">
          <div>
            <p className="text-[11px] tracking-[0.35em] text-[#8a7a5c]">AGHACI</p>
            <h2 className="mt-2 text-xl font-bold">{storeName}</h2>
            <div className="mt-2 space-y-0.5 text-[11.5px] text-[#5c564c]">
              {store["store.address"] ? <p>{store["store.address"]}</p> : null}
              {store["store.supportPhone"] ? <p dir="ltr">{store["store.supportPhone"]}</p> : null}
              {store["store.supportEmail"] ? <p dir="ltr">{store["store.supportEmail"]}</p> : null}
            </div>
          </div>
          <div className="text-left">
            <p className="text-[12px] font-semibold text-[#5c564c]">صورتحساب فروش</p>
            <p className="mt-1 text-lg font-bold" dir="ltr">{invoice.number}</p>
            <p className="mt-1 text-[11.5px] text-[#5c564c]">تاریخ صدور: {faDate(invoice.issuedAt)}</p>
            <p className="text-[11.5px] text-[#5c564c]">شماره سفارش: <span dir="ltr">{order.number}</span></p>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10.5px] font-semibold tracking-wide text-[#8a7a5c]">خریدار</p>
            <div className="mt-1 space-y-0.5 text-[12px] text-[#3d3931]">
              <p>{[order.user?.firstName, order.user?.lastName].filter(Boolean).join(" ") || "مهمان"}</p>
              <p dir="ltr">{order.email}</p>
              {order.user?.phone ? <p dir="ltr">{order.user.phone}</p> : null}
            </div>
          </div>
          <div>
            <p className="text-[10.5px] font-semibold tracking-wide text-[#8a7a5c]">نشانی تحویل</p>
            <div className="mt-1 space-y-0.5 text-[12px] text-[#3d3931]">
              {address.length ? address.map((line) => <p key={line}>{line}</p>) : <p>—</p>}
            </div>
          </div>
        </section>

        <table className="mt-6 w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#f4efe6] text-[#5c564c]">
              <th className="border border-[#e2ddd4] px-2 py-2 text-right font-semibold">#</th>
              <th className="border border-[#e2ddd4] px-2 py-2 text-right font-semibold">کالا</th>
              <th className="border border-[#e2ddd4] px-2 py-2 text-right font-semibold">کد</th>
              <th className="border border-[#e2ddd4] px-2 py-2 font-semibold">تعداد</th>
              <th className="border border-[#e2ddd4] px-2 py-2 font-semibold">قیمت واحد</th>
              <th className="border border-[#e2ddd4] px-2 py-2 font-semibold">جمع</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-[#e2ddd4] px-2 py-2">{faNum(index + 1)}</td>
                <td className="border border-[#e2ddd4] px-2 py-2">{item.name}</td>
                <td className="border border-[#e2ddd4] px-2 py-2" dir="ltr">{item.sku ?? "—"}</td>
                <td className="border border-[#e2ddd4] px-2 py-2 text-center">{faNum(item.quantity)}</td>
                <td className="border border-[#e2ddd4] px-2 py-2">{faMoney(item.unitPrice)}</td>
                <td className="border border-[#e2ddd4] px-2 py-2">{faMoney(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div className="max-w-[48%] text-[11.5px] text-[#5c564c]">
            {order.customerNote ? (
              <>
                <p className="font-semibold text-[#8a7a5c]">یادداشت مشتری</p>
                <p className="mt-1 leading-6">{order.customerNote}</p>
              </>
            ) : null}
            <p className="mt-3 leading-6">
              این فاکتور به‌صورت خودکار توسط پنل مدیریت {storeName} صادر شده است. مبالغ به تومان است و شامل مالیات بر ارزش افزوده‌ی محاسبه‌شده می‌باشد.
            </p>
          </div>
          <table className="w-full max-w-[280px] border-collapse text-[12px]">
            <tbody>
              {[
                ["جمع اقلام", faMoney(order.subtotal)],
                ["تخفیف", `− ${faMoney(order.discountAmount)}`],
                ["هزینه ارسال", faMoney(order.shippingAmount)],
                ["مالیات", faMoney(order.taxAmount)],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="border border-[#e2ddd4] px-2 py-1.5 text-[#5c564c]">{label}</td>
                  <td className="border border-[#e2ddd4] px-2 py-1.5 text-left">{value}</td>
                </tr>
              ))}
              <tr className="bg-[#f4efe6] font-bold">
                <td className="border border-[#e2ddd4] px-2 py-2">مبلغ قابل پرداخت</td>
                <td className="border border-[#e2ddd4] px-2 py-2 text-left">{faMoney(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className="mt-6 flex items-center justify-between border-t border-[#e2ddd4] pt-3 text-[10.5px] text-[#8a7a5c]">
          <span>تعداد اقلام: {faNum(itemsCount)} · واحد پول: تومان</span>
          <span dir="ltr">{invoice.number}</span>
        </footer>
      </div>
    </div>
  );
}
