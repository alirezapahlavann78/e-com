"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Modal,
  Pagination,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "../../components/ui";

interface Warehouse {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  isDefault: boolean;
}

interface InventoryItem {
  id: string;
  sku: string;
  stockQuantity: number;
  reservedQuantity: number;
  available: number;
  productName: string;
  productSlug: string;
  variantTitle?: string | null;
  productId: string;
  variantId?: string | null;
}

interface StockMovement {
  id: string;
  sku: string;
  quantity: number;
  type: string;
  reason: string | null;
  reference: string | null;
  createdAt: string;
  actorEmail?: string | null;
}

const faNum = (n: number) => n.toLocaleString("fa-IR");
const faDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("fa-IR");
  } catch {
    return d;
  }
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // مودال اصلاح / ورود موجودی
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState<"IN" | "OUT" | "CORRECTION">("IN");
  const [adjustReason, setAdjustReason] = useState("");
  const [saving, setSaving] = useState(false);

  // مودال انبار جدید
  const [warehouseModal, setWarehouseModal] = useState(false);
  const [whName, setWhName] = useState("");
  const [whCode, setWhCode] = useState("");
  const [savingWh, setSavingWh] = useState(false);

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q.trim()) params.set("q", q.trim());
      const [invData, whList, movData] = await Promise.all([
        adminApi<{ items: InventoryItem[]; total: number }>(`/admin/inventory/items?${params.toString()}`),
        adminApi<Warehouse[]>("/admin/inventory/warehouses"),
        adminApi<{ items: StockMovement[] }>("/admin/inventory/movements?limit=10"),
      ]);
      setItems(invData.items || []);
      setTotal(invData.total || 0);
      setWarehouses(whList || []);
      setMovements(movData.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات انبار");
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustQty("");
    setAdjustType("IN");
    setAdjustReason("");
    setAdjustModal(true);
  };

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !adjustQty) return;
    setSaving(true);
    try {
      const num = Number(adjustQty);
      const quantity = adjustType === "OUT" ? -Math.abs(num) : Math.abs(num);
      await adminApi("/admin/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          sku: selectedItem.sku,
          quantity,
          type: adjustType,
          reason: adjustReason || undefined,
        }),
      });
      setAdjustModal(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در تغییر موجودی کالا");
    } finally {
      setSaving(false);
    }
  };

  const submitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whName.trim() || !whCode.trim()) return;
    setSavingWh(true);
    try {
      await adminApi("/admin/inventory/warehouses", {
        method: "POST",
        body: JSON.stringify({ name: whName.trim(), code: whCode.trim().toUpperCase() }),
      });
      setWarehouseModal(false);
      setWhName("");
      setWhCode("");
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در ایجاد انبار جدید");
    } finally {
      setSavingWh(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">مدیریت انبار و موجودی</h1>
          <p className="text-sm opacity-60">
            {faNum(total)} ردیف کالا و متغیر در سیستم انبارداری
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setWarehouseModal(true)}>
            + تعریف انبار
          </Button>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500">{error}</p> : null}

      {/* انبارهای فعال */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {warehouses.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{w.name}</span>
              {w.isDefault ? <Badge variant="info">پیش‌فرض</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]" dir="ltr">
              کد انبار: {w.code}
            </p>
            <div className="mt-2">
              <Badge variant={w.isActive ? "success" : "neutral"}>
                {w.isActive ? "فعال" : "غیرفعال"}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* جدول موجودی کالاها */}
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="جستجو با SKU یا نام کالا…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="کالایی یافت نشد"
              description="هنوز کالایی در انبار تعریف نشده است."
            />
          ) : (
            <>
              <Table>
                <THead>
                  <TR>
                    <TH>کالا و متغیر</TH>
                    <TH>SKU</TH>
                    <TH>موجودی فیزیکی</TH>
                    <TH>رزرو سبد/سفارش</TH>
                    <TH>قابل فروش</TH>
                    <TH>عملیات</TH>
                  </TR>
                </THead>
                <TBody>
                  {items.map((it) => (
                    <TR key={it.id}>
                      <TD className="font-medium">
                        <div>{it.productName}</div>
                        {it.variantTitle ? (
                          <div className="text-xs text-[var(--muted)]">{it.variantTitle}</div>
                        ) : null}
                      </TD>
                      <TD className="text-xs font-mono" dir="ltr">
                        {it.sku}
                      </TD>
                      <TD className="text-xs font-semibold">{faNum(it.stockQuantity)}</TD>
                      <TD className="text-xs">
                        <Badge variant={it.reservedQuantity > 0 ? "warn" : "neutral"}>
                          {faNum(it.reservedQuantity)}
                        </Badge>
                      </TD>
                      <TD className="text-xs font-bold">
                        <span
                          className={
                            it.available <= 0
                              ? "text-red-500"
                              : it.available <= 5
                              ? "text-amber-500"
                              : "text-emerald-600 dark:text-emerald-400"
                          }
                        >
                          {faNum(it.available)}
                        </span>
                      </TD>
                      <TD>
                        <Button
                          variant="outline"
                          className="px-2.5 py-1 text-xs"
                          onClick={() => openAdjust(it)}
                        >
                          ورود / خروج
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

        {/* آخرین گردش‌های انبار */}
        <Card>
          <CardHeader title="آخرین تراکنش‌های انبار" subtitle="ورود، خروج و اصلاحات اخیر" />
          <div className="max-h-[500px] divide-y divide-[var(--border)] overflow-y-auto p-2">
            {movements.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--muted)]">گردشی ثبت نشده است.</p>
            ) : (
              movements.map((m) => (
                <div key={m.id} className="py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold" dir="ltr">
                      {m.sku}
                    </span>
                    <Badge variant={m.quantity > 0 ? "success" : "danger"}>
                      {m.quantity > 0 ? `+${faNum(m.quantity)}` : faNum(m.quantity)}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
                    <span>{m.reason || m.type}</span>
                    <span>{faDate(m.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* مودال ورود و خروج موجودی */}
      <Modal
        open={adjustModal}
        onClose={() => setAdjustModal(false)}
        title={`تغییر موجودی انبار: ${selectedItem?.productName || ""}`}
      >
        <form onSubmit={submitAdjust} className="space-y-4 text-sm">
          <div>
            <Label>کد کالا (SKU)</Label>
            <Input disabled dir="ltr" value={selectedItem?.sku || ""} />
          </div>
          <div>
            <Label>نوع عملیات</Label>
            <Select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as any)}
            >
              <option value="IN">ورود به انبار (افزایش موجودی)</option>
              <option value="OUT">خروج از انبار (کاهش موجودی)</option>
              <option value="CORRECTION">اصلاحیه انبارگردانی</option>
            </Select>
          </div>
          <div>
            <Label>تعداد *</Label>
            <Input
              required
              type="number"
              min="1"
              dir="ltr"
              placeholder="مثال: 10"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
            />
          </div>
          <div>
            <Label>علت یا مرجع تغییر</Label>
            <Input
              placeholder="مثال: فاکتور خرید یا کسری انبارگردانی"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAdjustModal(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "در حال ثبت…" : "ثبت تراکنش انبار"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* مودال ایجاد انبار جدید */}
      <Modal
        open={warehouseModal}
        onClose={() => setWarehouseModal(false)}
        title="تعریف انبار جدید"
      >
        <form onSubmit={submitWarehouse} className="space-y-4 text-sm">
          <div>
            <Label>نام انبار *</Label>
            <Input
              required
              placeholder="مثال: انبار مرکزی تهران"
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
            />
          </div>
          <div>
            <Label>کد انبار *</Label>
            <Input
              required
              dir="ltr"
              placeholder="مثال: WH-TEH-01"
              value={whCode}
              onChange={(e) => setWhCode(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setWarehouseModal(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={savingWh}>
              {savingWh ? "در حال ایجاد…" : "ایجاد انبار"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
