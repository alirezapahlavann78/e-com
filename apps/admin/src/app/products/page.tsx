"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/api";
import { Badge, Button, Card, Input, Label, Modal, Pagination, Select, Spinner, StatusBadge, Table, TBody, TD, TH, THead, TR, Textarea } from "../../components/ui";

type ProductStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

interface ProductImage { id: string; url: string; alt?: string | null; sortOrder: number; isPrimary: boolean }
interface VariantAttr { attributeValue: { value: string; attribute: { name: string } } }
interface ProductVariant { id: string; sku: string; title?: string | null; price?: string | number | null; stockQuantity: number; isActive: boolean; attributes: VariantAttr[] }
interface ProductSeo { metaTitle?: string | null; metaDescription?: string | null; canonicalUrl?: string | null; noIndex: boolean }
interface ProductCategoryLink { categoryId: string; category: { id: string; name: string; slug: string } }
interface Product {
  id: string; name: string; slug: string; shortDescription?: string | null; description?: string | null;
  type?: string; status: ProductStatus; sku?: string | null; barcode?: string | null;
  basePrice?: string | number | null; compareAtPrice?: string | number | null; stockQuantity: number;
  scheduledAt?: string | null; publishedAt?: string | null; createdAt: string;
  images: ProductImage[]; variants: ProductVariant[]; seo?: ProductSeo | null; categories: ProductCategoryLink[];
}
interface ListResponse { items: Product[]; total: number; page: number; limit: number }
interface Category { id: string; name: string; slug: string }

const money = (v: unknown) => (v === null || v === undefined || v === "") ? "—" : `${new Intl.NumberFormat("fa-IR").format(Number(v))} تومان`;
const date = (v?: string | null) => (v ? new Date(v).toLocaleDateString("fa-IR") : "—");

const STATUS_TABS: { key: "" | ProductStatus; label: string }[] = [
  { key: "", label: "همه" },
  { key: "DRAFT", label: "پیش‌نویس" },
  { key: "SCHEDULED", label: "زمان‌بندی‌شده" },
  { key: "PUBLISHED", label: "منتشرشده" },
  { key: "ARCHIVED", label: "آرشیو" },
];

const emptyForm = {
  name: "", slug: "", shortDescription: "", description: "",
  type: "SIMPLE", status: "DRAFT" as ProductStatus, sku: "", barcode: "",
  basePrice: "", compareAtPrice: "", stockQuantity: "", scheduledAt: "",
  metaTitle: "", metaDescription: "",
};

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | ProductStatus>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detail, setDetail] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [checkedCategories, setCheckedCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      const data = await adminApi<ListResponse>(`/admin/products?${params.toString()}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت محصولات");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    void adminApi<Category[]>("/admin/categories").then(setCategories).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [items, search]);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetail(null);
    try { setDetail(await adminApi<Product>(`/admin/products/${id}`)); }
    catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت محصول"); setDetailOpen(false); }
  };

  const submitCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = { name: form.name, slug: form.slug };
      if (form.shortDescription) body.shortDescription = form.shortDescription;
      if (form.description) body.description = form.description;
      body.type = form.type;
      body.status = form.status;
      if (form.sku) body.sku = form.sku;
      if (form.barcode) body.barcode = form.barcode;
      if (form.basePrice !== "") body.basePrice = Number(form.basePrice);
      if (form.compareAtPrice !== "") body.compareAtPrice = Number(form.compareAtPrice);
      if (form.stockQuantity !== "") body.stockQuantity = Number(form.stockQuantity);
      if (form.scheduledAt) body.scheduledAt = form.scheduledAt;
      if (checkedCategories.length) body.categoryIds = checkedCategories;
      if (form.metaTitle || form.metaDescription) body.seo = { metaTitle: form.metaTitle || undefined, metaDescription: form.metaDescription || undefined };
      await adminApi("/admin/products", { method: "POST", body: JSON.stringify(body) });
      setCreateOpen(false);
      setForm(emptyForm);
      setCheckedCategories([]);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "خطا در ذخیره محصول");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">محصولات</h1>
          <p className="text-sm opacity-60">{new Intl.NumberFormat("fa-IR").format(total)} محصول</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ محصول جدید</Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setStatus(t.key); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${status === t.key ? "bg-indigo-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
            >
              {t.label}
            </button>
          ))}
          <div className="ms-auto w-full sm:w-64">
            <Input placeholder="جستجو در صفحه فعلی…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <TH>تصویر</TH><TH>نام</TH><TH>SKU</TH><TH>قیمت</TH><TH>وضعیت</TH><TH>موجودی</TH><TH>تاریخ ایجاد</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((p) => {
                  const variantStock = p.variants?.reduce((s, v) => s + v.stockQuantity, 0) ?? 0;
                  const stock = p.type === "VARIABLE" && p.variants?.length ? variantStock : p.stockQuantity;
                  const img = p.images?.[0];
                  return (
                    <TR key={p.id} className="cursor-pointer" onClick={() => void openDetail(p.id)}>
                      <TD>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img.url} alt={img.alt ?? p.name} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/5 text-xs opacity-50 dark:bg-white/10">—</div>
                        )}
                      </TD>
                      <TD className="font-medium">{p.name}</TD>
                      <TD className="text-xs opacity-70">{p.sku ?? "—"}</TD>
                      <TD>{money(p.basePrice)}</TD>
                      <TD><StatusBadge status={p.status} /></TD>
                      <TD>
                        <Badge variant={stock > 0 ? "success" : "danger"}>{new Intl.NumberFormat("fa-IR").format(stock)}</Badge>
                      </TD>
                      <TD className="text-xs opacity-70">{date(p.createdAt)}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            {filtered.length === 0 && <div className="p-10 text-center text-sm opacity-60">محصولی یافت نشد.</div>}
          </>
        )}

        {total > limit && (
          <div className="border-t p-3">
            <Pagination page={page} limit={limit} total={total} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="جزئیات محصول">
        {!detail ? (
          <div className="flex justify-center p-10"><Spinner /></div>
        ) : (
          <div className="space-y-5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{detail.name}</h3>
                <p className="text-xs opacity-60" dir="ltr">{detail.slug}</p>
              </div>
              <StatusBadge status={detail.status} />
            </div>

            {detail.shortDescription && <p className="opacity-80">{detail.shortDescription}</p>}

            {detail.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.id} src={img.url} alt={img.alt ?? detail.name} className="h-20 w-20 rounded-lg object-cover" />
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Info label="قیمت پایه" value={money(detail.basePrice)} />
              <Info label="قیمت قبل از تخفیف" value={money(detail.compareAtPrice)} />
              <Info label="SKU" value={detail.sku ?? "—"} />
              <Info label="بارکد" value={detail.barcode ?? "—"} />
              <Info label="موجودی" value={new Intl.NumberFormat("fa-IR").format(detail.stockQuantity)} />
              <Info label="نوع" value={detail.type === "VARIABLE" ? "متغیر" : "ساده"} />
              <Info label="تاریخ انتشار" value={date(detail.publishedAt)} />
              <Info label="زمان‌بندی" value={date(detail.scheduledAt)} />
            </div>

            {detail.categories.length > 0 && (
              <div>
                <h4 className="mb-2 font-semibold">دسته‌بندی‌ها</h4>
                <div className="flex flex-wrap gap-2">
                  {detail.categories.map((c) => <Badge key={c.categoryId}>{c.category.name}</Badge>)}
                </div>
              </div>
            )}

            {detail.variants.length > 0 && (
              <div>
                <h4 className="mb-2 font-semibold">متغیرها</h4>
                <Table>
                  <THead><TR><TH>SKU</TH><TH>عنوان</TH><TH>ویژگی‌ها</TH><TH>قیمت</TH><TH>موجودی</TH></TR></THead>
                  <TBody>
                    {detail.variants.map((v) => (
                      <TR key={v.id}>
                        <TD className="text-xs" dir="ltr">{v.sku}</TD>
                        <TD>{v.title ?? "—"}</TD>
                        <TD className="text-xs">{v.attributes.map((a) => `${a.attributeValue.attribute.name}: ${a.attributeValue.value}`).join("، ") || "—"}</TD>
                        <TD>{money(v.price)}</TD>
                        <TD>{new Intl.NumberFormat("fa-IR").format(v.stockQuantity)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}

            {detail.seo && (
              <div>
                <h4 className="mb-2 font-semibold">سئو</h4>
                <div className="space-y-1 rounded-lg bg-black/5 p-3 dark:bg-[var(--panel-2)]">
                  <p>عنوان متا: {detail.seo.metaTitle ?? "—"}</p>
                  <p>توضیحات متا: {detail.seo.metaDescription ?? "—"}</p>
                  <p>آدرس کنونیکال: {detail.seo.canonicalUrl ?? "—"}</p>
                  <p>noIndex: {detail.seo.noIndex ? "بله" : "خیر"}</p>
                </div>
              </div>
            )}

            {detail.description && (
              <div>
                <h4 className="mb-2 font-semibold">توضیحات</h4>
                <p className="whitespace-pre-wrap leading-7 opacity-80">{detail.description}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="محصول جدید">
        <form onSubmit={submitCreate} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>نام *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>اسلاگ *</Label><Input required dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
            <div><Label>SKU</Label><Input dir="ltr" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><Label>بارکد</Label><Input dir="ltr" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
            <div><Label>قیمت پایه (تومان)</Label><Input type="number" dir="ltr" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} /></div>
            <div><Label>قیمت قبل از تخفیف</Label><Input type="number" dir="ltr" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} /></div>
            <div><Label>موجودی</Label><Input type="number" dir="ltr" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} /></div>
            <div><Label>زمان‌بندی انتشار</Label><Input type="datetime-local" dir="ltr" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
            <div>
              <Label>نوع</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="SIMPLE">ساده</option>
                <option value="VARIABLE">متغیر</option>
              </Select>
            </div>
            <div>
              <Label>وضعیت</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}>
                <option value="DRAFT">پیش‌نویس</option>
                <option value="SCHEDULED">زمان‌بندی‌شده</option>
                <option value="PUBLISHED">منتشرشده</option>
                <option value="ARCHIVED">آرشیو</option>
              </Select>
            </div>
          </div>

          <div><Label>توضیح کوتاه</Label><Input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} /></div>
          <div><Label>توضیحات</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          {categories.length > 0 && (
            <div>
              <Label>دسته‌بندی‌ها</Label>
              <div className="flex flex-wrap gap-2 rounded-lg border p-3">
                {categories.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={checkedCategories.includes(c.id)}
                      onChange={(e) => setCheckedCategories(e.target.checked ? [...checkedCategories, c.id] : checkedCategories.filter((x) => x !== c.id))}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>عنوان متا</Label><Input value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} /></div>
            <div><Label>توضیحات متا</Label><Input value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} /></div>
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>انصراف</Button>
            <Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/5 p-3 dark:bg-[var(--panel-2)]">
      <p className="text-xs opacity-60">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
