"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "../../components/ui";

interface DiscountCode {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: string | number;
  minSubtotal?: string | number | null;
  maxDiscount?: string | number | null;
  usageLimit?: number | null;
  usageCount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  createdAt: string;
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

const emptyForm = {
  code: "",
  type: "PERCENT",
  value: "",
  minSubtotal: "",
  maxDiscount: "",
  usageLimit: "",
  startsAt: "",
  endsAt: "",
  isActive: "true",
};

export default function DiscountsPage() {
  const [items, setItems] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminApi<DiscountCode[]>("/discounts");
      setItems(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت کدهای تخفیف");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openForm = (d?: DiscountCode) => {
    setEditing(d ?? null);
    setFormError("");
    setForm(
      d
        ? {
            code: d.code,
            type: d.type,
            value: String(d.value),
            minSubtotal: d.minSubtotal ? String(d.minSubtotal) : "",
            maxDiscount: d.maxDiscount ? String(d.maxDiscount) : "",
            usageLimit: d.usageLimit ? String(d.usageLimit) : "",
            startsAt: d.startsAt ? d.startsAt.slice(0, 10) : "",
            endsAt: d.endsAt ? d.endsAt.slice(0, 10) : "",
            isActive: String(d.isActive),
          }
        : emptyForm
    );
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        isActive: form.isActive === "true",
      };
      if (form.minSubtotal) body.minSubtotal = Number(form.minSubtotal);
      if (form.maxDiscount) body.maxDiscount = Number(form.maxDiscount);
      if (form.usageLimit) body.usageLimit = Number(form.usageLimit);
      if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString();
      if (form.endsAt) body.endsAt = new Date(form.endsAt).toISOString();

      if (editing) {
        await adminApi(`/discounts/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await adminApi("/discounts", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "خطا در ذخیره کد تخفیف");
    } finally {
      setSaving(false);
    }
  };

  const removeCode = async (id: string) => {
    if (!confirm("آیا از حذف این کد تخفیف اطمینان دارید؟")) return;
    try {
      await adminApi(`/discounts/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در حذف کد تخفیف");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مدیریت کدهای تخفیف</h1>
          <p className="text-sm opacity-60">
            {faNum(items.length)} کد تخفیف و کوپن تبلیغاتی فعال در سیستم
          </p>
        </div>
        <Button onClick={() => openForm()}>+ کد تخفیف جدید</Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center p-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="هیچ کد تخفیفی تعریف نشده است"
            description="برای جذب مشتریان اولین کوپن تخفیف را ایجاد کنید."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>کد کوپن</TH>
                <TH>نوع و میزان</TH>
                <TH>حداقل سبد خرید</TH>
                <TH>سقف / تعداد استفاده</TH>
                <TH>وضعیت</TH>
                <TH>بازه زمانی</TH>
                <TH>عملیات</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((d) => (
                <TR key={d.id}>
                  <TD className="font-mono font-bold text-sky-600 dark:text-sky-400" dir="ltr">
                    {d.code}
                  </TD>
                  <TD className="text-xs">
                    {d.type === "PERCENT" ? (
                      <Badge variant="info">{faNum(Number(d.value))} درصد</Badge>
                    ) : (
                      <Badge variant="success">{faMoney(Number(d.value))}</Badge>
                    )}
                  </TD>
                  <TD className="text-xs">
                    {d.minSubtotal ? faMoney(Number(d.minSubtotal)) : "بدون حداقل"}
                  </TD>
                  <TD className="text-xs">
                    <span>
                      {faNum(d.usageCount)}
                      {d.usageLimit ? ` از ${faNum(d.usageLimit)}` : " بار (نامحدود)"}
                    </span>
                  </TD>
                  <TD>
                    <Badge variant={d.isActive ? "success" : "danger"}>
                      {d.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </TD>
                  <TD className="text-xs opacity-70">
                    {faDate(d.startsAt)} — {faDate(d.endsAt)}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        className="px-2.5 py-1 text-xs"
                        onClick={() => openForm(d)}
                      >
                        ویرایش
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-500/10"
                        onClick={() => removeCode(d.id)}
                      >
                        حذف
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* مودال ایجاد و ویرایش کوپن */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `ویرایش کد: ${editing.code}` : "کد تخفیف جدید"}
      >
        <form onSubmit={submit} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>کد کوپن *</Label>
              <Input
                required
                dir="ltr"
                placeholder="مثال: SPRING1403"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <Label>نوع تخفیف</Label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="PERCENT">درصدی (%)</option>
                <option value="FIXED">مبلغ ثابت (تومان)</option>
              </Select>
            </div>
            <div>
              <Label>مقدار تخفیف *</Label>
              <Input
                required
                type="number"
                min="1"
                dir="ltr"
                placeholder={form.type === "PERCENT" ? "مثال: 20" : "مثال: 50000"}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
            <div>
              <Label>حداقل مبلغ خرید (تومان)</Label>
              <Input
                type="number"
                min="0"
                dir="ltr"
                placeholder="اختیاری"
                value={form.minSubtotal}
                onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })}
              />
            </div>
            <div>
              <Label>سقف تخفیف (برای درصدی)</Label>
              <Input
                type="number"
                min="0"
                dir="ltr"
                placeholder="اختیاری"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
              />
            </div>
            <div>
              <Label>حداکثر دفعات استفاده</Label>
              <Input
                type="number"
                min="1"
                dir="ltr"
                placeholder="بدون محدودیت"
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              />
            </div>
            <div>
              <Label>تاریخ شروع</Label>
              <Input
                type="date"
                dir="ltr"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div>
              <Label>تاریخ انقضا</Label>
              <Input
                type="date"
                dir="ltr"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>وضعیت</Label>
            <Select
              value={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.value })}
            >
              <option value="true">فعال</option>
              <option value="false">غیرفعال</option>
            </Select>
          </div>
          {formError ? <p className="text-xs text-red-500">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "در حال ذخیره…" : "ذخیره کد تخفیف"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
