import { statusFa } from "../lib/format";

const STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  AWAITING_PAYMENT: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-stone-200 text-stone-700",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-stone-200 text-stone-700",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-stone-200 text-stone-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${style}`}>{statusFa(status)}</span>;
}
