"use client";
import React from "react";

/* ---------- Button ---------- */
type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 disabled:pointer-events-none";
const btnVariants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-white hover:brightness-95",
  outline: "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--panel-2)]",
  ghost: "text-[var(--foreground)] hover:bg-[var(--panel-2)]",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={`${btnBase} ${btnVariants[variant]} ${className}`} {...props} />;
}

/* ---------- Card ---------- */
export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm ${className}`} {...props} />;
}
export function CardHeader({ title, subtitle, action, className = "" }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------- Form primitives ---------- */
const fieldCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--foreground)] " +
  "placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25";
export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldCls} ${className}`} {...props} />;
}
export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldCls} ${className}`} {...props} />;
}
export function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldCls} min-h-24 ${className}`} {...props} />;
}
export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`mb-1.5 block text-xs font-medium text-[var(--muted)] ${className}`} {...props} />;
}

/* ---------- Badge ---------- */
type BadgeVariant = "success" | "warn" | "danger" | "neutral" | "info";
const badgeVariants: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/30",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400 ring-red-500/30",
  neutral: "bg-slate-500/10 text-slate-600 dark:text-[var(--foreground)] ring-slate-500/30",
  info: "bg-[var(--accent)]/10 text-[var(--accent)] ring-[var(--accent)]/30",
};
export function Badge({ variant = "neutral", className = "", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeVariants[variant]} ${className}`} {...props} />;
}

/* ---------- StatusBadge ---------- */
const orderStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "در انتظار", variant: "neutral" },
  AWAITING_PAYMENT: { label: "در انتظار پرداخت", variant: "warn" },
  PAID: { label: "پرداخت شده", variant: "success" },
  PROCESSING: { label: "در حال پردازش", variant: "info" },
  SHIPPED: { label: "ارسال شده", variant: "info" },
  DELIVERED: { label: "تحویل شده", variant: "success" },
  CANCELLED: { label: "لغو شده", variant: "danger" },
  COMPLETED: { label: "تکمیل شده", variant: "success" },
  REFUNDED: { label: "بازپرداخت شده", variant: "warn" },
  RETURN_REQUESTED: { label: "درخواست مرجوعی", variant: "warn" },
};
const paymentStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "در انتظار پرداخت", variant: "neutral" },
  AUTHORIZED: { label: "تایید موقت", variant: "info" },
  PAID: { label: "پرداخت شده", variant: "success" },
  FAILED: { label: "ناموفق", variant: "danger" },
  REFUNDED: { label: "بازپرداخت شده", variant: "warn" },
};
const shipmentStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "در انتظار", variant: "neutral" },
  PROCESSING: { label: "در حال پردازش", variant: "info" },
  SHIPPED: { label: "ارسال شده", variant: "info" },
  IN_TRANSIT: { label: "در راه", variant: "info" },
  DELIVERED: { label: "تحویل شده", variant: "success" },
  RETURNED: { label: "بازگشتی", variant: "warn" },
};
const returnStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  REQUESTED: { label: "درخواست شده", variant: "neutral" },
  APPROVED: { label: "تایید شده", variant: "info" },
  REJECTED: { label: "رد شده", variant: "danger" },
  RECEIVED: { label: "دریافت شد", variant: "info" },
  REFUNDED: { label: "بازپرداخت شده", variant: "success" },
  CLOSED: { label: "بسته شده", variant: "neutral" },
};
const refundStatusMap: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "در انتظار", variant: "neutral" },
  APPROVED: { label: "تایید شده", variant: "info" },
  PROCESSED: { label: "انجام شده", variant: "success" },
  FAILED: { label: "ناموفق", variant: "danger" },
};
const statusMaps = { order: orderStatusMap, payment: paymentStatusMap, shipment: shipmentStatusMap, return: returnStatusMap, refund: refundStatusMap };
export function StatusBadge({ status, kind = "order" }: { status: string; kind?: "order" | "payment" | "shipment" | "return" | "refund" }) {
  const map = statusMaps[kind];
  const entry = map[status] ?? { label: status, variant: "neutral" as BadgeVariant };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

/* ---------- Table ---------- */
export function Table({ className = "", ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-right text-sm ${className}`} {...props} />
    </div>
  );
}
export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="bg-[var(--panel-2)] text-xs text-[var(--muted)]" {...props} />;
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-[var(--border)]" {...props} />;
}
export function TR({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`hover:bg-[var(--panel-2)]/60 ${className}`} {...props} />;
}
export function TH({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`px-4 py-3 font-medium ${className}`} {...props} />;
}
export function TD({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 align-middle ${className}`} {...props} />;
}

/* ---------- Spinner ---------- */
export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin text-[var(--muted)] ${className}`} viewBox="0 0 24 24" fill="none" aria-label="بارگذاری">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- EmptyState ---------- */
export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="text-[var(--muted)]">{icon ?? <svg className="mx-auto h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" /><path d="M3 7l9 4 9-4M12 11v10" /></svg>}</div>
      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
      {description ? <p className="max-w-sm text-xs text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

/* ---------- Modal (client) ---------- */
import { useEffect } from "react";
import { createPortal } from "react-dom";
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const [mounted, setMounted] = React.useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--panel-2)]" aria-label="بستن">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-start gap-2 border-t border-[var(--border)] px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}

/* ---------- Pagination (client) ---------- */
export function Pagination({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-between px-4 py-3 text-xs text-[var(--muted)]" aria-label="صفحه‌بندی">
      <span>صفحه {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")} — {total.toLocaleString("fa-IR")} مورد</span>
      <div className="flex gap-1">
        <Button variant="outline" className="px-3 py-1" disabled={page <= 1} onClick={() => onPage(page - 1)}>قبلی</Button>
        <Button variant="outline" className="px-3 py-1" disabled={page >= pages} onClick={() => onPage(page + 1)}>بعدی</Button>
      </div>
    </nav>
  );
}

/* ---------- Tabs (client) ---------- */
export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-[var(--border)]" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            active === t.key
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
