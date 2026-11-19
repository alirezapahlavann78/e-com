"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../../lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Label,
  Modal,
  Pagination,
  Select,
  Spinner,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from "../../../components/ui";

interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  reason: string;
  note: string | null;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: string | number;
  }[];
  createdAt: string;
  user?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

const faNum = (n: number) => n.toLocaleString("fa-IR");
const faMoney = (n: number) => `${Math.round(Number(n) || 0).toLocaleString("fa-IR")} تومان`;
const faDate = (d?: string | null) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fa-IR");
  } catch {
    return d;
  }
};

const statusOptions = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "REQUESTED", label: "درخواست شده" },
  { value: "APPROVED", label: "تأیید شده" },
  { value: "REJECTED", label: "رد شده" },
  { value: "RECEIVED", label: "کالا دریافت شد" },
  { value: "REFUNDED", label: "مبلغ بازپرداخت شد" },
];

export default function ReturnsPage() {
  const [items, setItems] = useState<ReturnRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reviewModal, setReviewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [newStatus, setNewStatus] = useState("APPROVED");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      const data = await adminApi<{ items: ReturnRequest[]; total: number }>(
        `/admin/orders/returns?${params.toString()}`
      );
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت درخواست‌های مرجوعی");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (r: ReturnRequest) => {
    setSelectedReturn(r);
    setNewStatus(r.status === "REQUESTED" ? "APPROVED" : r.status);
    setAdminNote(r.note || "");
    setReviewModal(true);
  };

  const submitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;
    setSaving(true);
    try {
      await adminApi(`/admin/orders/returns/${selectedReturn.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          note: adminNote.trim() || undefined,
        }),
      });
      setReviewModal(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در ثبت وضعیت مرجوعی");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مدیریت مرجوعی‌ها و استرداد</h1>
          <p className="text-sm opacity-60">
            {faNum(total)} مورد درخواست مرجوعی کالا در سیستم
          </p>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-3">
          <div className="w-full sm:w-56">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="هیچ درخواستی یافت نشد"
            description="درخواست مرجوعی فعالی وجود ندارد."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>سفارش</TH>
                  <TH>مشتری</TH>
                  <TH>دلیل استرداد</TH>
                  <TH>تعداد اقلام</TH>
                  <TH>وضعیت</TH>
                  <TH>تاریخ درخواست</TH>
                  <TH>عملیات</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-mono text-xs font-semibold" dir="ltr">
                      {r.orderNumber || r.orderId}
                    </TD>
                    <TD className="text-xs">
                      <div>
                        {[r.user?.firstName, r.user?.lastName].filter(Boolean).join(" ") || "—"}
                      </div>
                      <div className="text-[var(--muted)]" dir="ltr">
                        {r.user?.email}
                      </div>
                    </TD>
                    <TD className="text-xs max-w-xs truncate">{r.reason}</TD>
                    <TD className="text-xs">
                      <Badge variant="info">{faNum(r.items?.length || 0)} قلم</Badge>
                    </TD>
                    <TD>
                      <StatusBadge status={r.status} kind="return" />
                    </TD>
                    <TD className="text-xs opacity-70">{faDate(r.createdAt)}</TD>
                    <TD>
                      <Button
                        variant="outline"
                        className="px-2.5 py-1 text-xs"
                        onClick={() => openReview(r)}
                      >
                        بررسی و تصمیم‌گیری
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {total > limit && (
              <div className="border-t border-[var(--border)] p-3">
                <Pagination page={page} limit={limit} total={total} onPage={setPage} />
              </div>
            )}
          </>
        )}
      </Card>

      {/* مودال بررسی مرجوعی */}
      <Modal
        open={reviewModal}
        onClose={() => setReviewModal(false)}
        title={`رسیدگی به مرجوعی سفارش: ${selectedReturn?.orderNumber || ""}`}
      >
        <form onSubmit={submitStatus} className="space-y-4 text-sm">
          <div className="rounded-lg bg-[var(--panel-2)] p-3 space-y-1">
            <p className="text-xs text-[var(--muted)]">علت اعلام‌شده توسط خریدار:</p>
            <p className="font-medium text-[var(--foreground)]">{selectedReturn?.reason}</p>
          </div>

          <div>
            <Label>تعیین وضعیت</Label>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="APPROVED">تأیید درخواست (آماده تحویل انبار)</option>
              <option value="REJECTED">رد درخواست مرجوعی</option>
              <option value="RECEIVED">کالا در انبار دریافت و بررسی شد</option>
              <option value="REFUNDED">مبلغ سفارش بازپرداخت شد</option>
            </Select>
          </div>

          <div>
            <Label>توضیحات و پاسخ برای مشتری</Label>
            <Textarea
              placeholder="توضیحات یا آدرس پستی جهت ارسال کالا…"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReviewModal(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت وضعیت"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
