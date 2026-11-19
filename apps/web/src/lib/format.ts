export function formatPrice(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("fa-IR").format(n)} تومان`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

export const PRODUCT_STATUS_FA: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  SCHEDULED: "زمان‌بندی‌شده",
  PUBLISHED: "منتشرشده",
  ARCHIVED: "بایگانی",
};

export const ORDER_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار",
  AWAITING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  PROCESSING: "در حال پردازش",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغو‌شده",
  COMPLETED: "تکمیل‌شده",
};

export const PAYMENT_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  REFUNDED: "بازپرداخت‌شده",
  CANCELLED: "لغو‌شده",
};

export function statusFa(status: string): string {
  return ORDER_STATUS_FA[status] ?? PAYMENT_STATUS_FA[status] ?? PRODUCT_STATUS_FA[status] ?? status;
}
