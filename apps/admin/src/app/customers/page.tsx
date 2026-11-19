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
  Textarea,
} from "../../components/ui";

interface CustomerProfile {
  id: string;
  marketingOptIn: boolean;
  smsOptIn: boolean;
  lifetimeValue: string | number;
  ordersCount: number;
  lastOrderAt: string | null;
}

interface CustomerItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  profile: CustomerProfile | null;
  _count: {
    orders: number;
    reviews: number;
    wishlistItems: number;
  };
}

interface CustomerListResponse {
  items: CustomerItem[];
  total: number;
  page: number;
  limit: number;
}

interface OrderSummary {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  total: string | number;
  createdAt: string;
}

interface CustomerNote {
  id: string;
  type: "GENERAL" | "SUPPORT" | "RISK" | "MARKETING";
  body: string;
  actorEmail: string | null;
  createdAt: string;
}

interface CustomerDetail extends CustomerItem {
  lastLoginAt: string | null;
  orders: OrderSummary[];
  segmentLinks: { segment: { id: string; name: string; slug: string } }[];
  tagLinks: { tag: { id: string; name: string; color: string | null } }[];
  notes: CustomerNote[];
  ltv: {
    paidOrders: number;
    total: number;
    lastOrderAt: string | null;
  };
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

const noteTypeLabels: Record<string, string> = {
  GENERAL: "عمومی",
  SUPPORT: "پشتیبانی",
  RISK: "ریسک / تقلب",
  MARKETING: "بازاریابی",
};

export default function CustomersPage() {
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // فرم ثبت یادداشت جدید
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<"GENERAL" | "SUPPORT" | "RISK" | "MARKETING">("GENERAL");
  const [savingNote, setSavingNote] = useState(false);

  // فرم تغییر اشتراک بازاریابی/پیامک
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q.trim()) params.set("q", q.trim());
      const data = await adminApi<CustomerListResponse>(`/crm/customers?${params.toString()}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت لیست مشتریان");
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const data = await adminApi<CustomerDetail>(`/crm/customers/${id}`);
      setDetail(data);
      setMarketingOptIn(Boolean(data.profile?.marketingOptIn));
      setSmsOptIn(Boolean(data.profile?.smsOptIn));
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطا در دریافت جزئیات مشتری");
    } finally {
      setLoadingDetail(false);
    }
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !noteBody.trim()) return;
    setSavingNote(true);
    try {
      await adminApi(`/crm/customers/${selectedId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: noteBody.trim(), type: noteType }),
      });
      setNoteBody("");
      const updated = await adminApi<CustomerDetail>(`/crm/customers/${selectedId}`);
      setDetail(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در ثبت یادداشت");
    } finally {
      setSavingNote(false);
    }
  };

  const saveProfilePreferences = async () => {
    if (!selectedId) return;
    setSavingProfile(true);
    try {
      await adminApi(`/crm/customers/${selectedId}/profile`, {
        method: "PATCH",
        body: JSON.stringify({ marketingOptIn, smsOptIn }),
      });
      const updated = await adminApi<CustomerDetail>(`/crm/customers/${selectedId}`);
      setDetail(updated);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در به‌روزرسانی تنظیمات مشتری");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">مدیریت مشتریان و CRM</h1>
          <p className="text-sm opacity-60">
            {faNum(total)} کاربر ثبت‌نامی در فروشگاه
          </p>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] p-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="جستجو با ایمیل، نام یا نام خانوادگی…"
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
        ) : error ? (
          <div className="p-6 text-sm text-red-500">{error}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="مشتری‌ای یافت نشد"
            description="هنوز مشتری فعالی با این معیارها ثبت نشده است."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>مشتری</TH>
                  <TH>ایمیل / تماس</TH>
                  <TH>سفارش‌ها</TH>
                  <TH>دیدگاه‌ها / نشان‌ها</TH>
                  <TH>ارزش مشتری (LTV)</TH>
                  <TH>تاریخ عضویت</TH>
                  <TH>عملیات</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((c) => {
                  const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
                  return (
                    <TR key={c.id}>
                      <TD className="font-medium">
                        {fullName || "—"}
                        <div className="text-xs text-[var(--muted)]">
                          {c.status === "ACTIVE" ? (
                            <Badge variant="success">فعال</Badge>
                          ) : (
                            <Badge variant="warn">{c.status}</Badge>
                          )}
                        </div>
                      </TD>
                      <TD dir="ltr" className="text-xs">
                        <div>{c.email}</div>
                        {c.phone ? <div className="text-[var(--muted)]">{c.phone}</div> : null}
                      </TD>
                      <TD>
                        <Badge variant="info">{faNum(c._count.orders)} سفارش</Badge>
                      </TD>
                      <TD className="text-xs">
                        <span>{faNum(c._count.reviews)} نظر</span>
                        <span className="mx-1.5 opacity-40">|</span>
                        <span>{faNum(c._count.wishlistItems)} علاقه‌مندی</span>
                      </TD>
                      <TD className="font-medium text-emerald-600 dark:text-emerald-400">
                        {faMoney(Number(c.profile?.lifetimeValue ?? 0))}
                      </TD>
                      <TD className="text-xs opacity-70">{faDate(c.createdAt)}</TD>
                      <TD>
                        <Button
                          variant="outline"
                          className="px-3 py-1 text-xs"
                          onClick={() => openDetail(c.id)}
                        >
                          مشاهده پرونده
                        </Button>
                      </TD>
                    </TR>
                  );
                })}
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

      {/* مودال مشاهده کامل پرونده مشتری */}
      <Modal
        open={Boolean(selectedId)}
        onClose={() => {
          setSelectedId(null);
          setDetail(null);
        }}
        title={`پرونده مشتری: ${[detail?.firstName, detail?.lastName].filter(Boolean).join(" ") || detail?.email || ""}`}
      >
        {loadingDetail || !detail ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <div className="space-y-6 text-sm">
            {/* کارت شاخص‌های مشتری */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <p className="text-xs text-[var(--muted)]">سفارش‌های موفق</p>
                <p className="mt-1 text-lg font-bold">{faNum(detail.ltv.paidOrders)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <p className="text-xs text-[var(--muted)]">مجموع خرید (LTV)</p>
                <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {faMoney(detail.ltv.total)}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <p className="text-xs text-[var(--muted)]">آخرین خرید</p>
                <p className="mt-1 text-xs font-semibold">{faDate(detail.ltv.lastOrderAt)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <p className="text-xs text-[var(--muted)]">آخرین ورود</p>
                <p className="mt-1 text-xs font-semibold">{faDate(detail.lastLoginAt)}</p>
              </div>
            </div>

            {/* برچسب‌ها و سگمنت‌ها */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--muted)]">دسته‌بندی و سگمنت‌های مشتری:</p>
              <div className="flex flex-wrap gap-1.5">
                {detail.segmentLinks.length === 0 && detail.tagLinks.length === 0 ? (
                  <span className="text-xs text-[var(--muted)]">بدون سگمنت یا برچسب اختصاصی</span>
                ) : null}
                {detail.segmentLinks.map((s) => (
                  <Badge key={s.segment.id} variant="info">
                    سگمنت: {s.segment.name}
                  </Badge>
                ))}
                {detail.tagLinks.map((t) => (
                  <Badge key={t.tag.id} variant="neutral">
                    #{t.tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* تنظیمات ارتباط و پیامک */}
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
              <p className="text-xs font-bold text-[var(--foreground)]">کانال‌های بازاریابی و اطلاع‌رسانی</p>
              <div className="flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="rounded border-[var(--border)]"
                  />
                  <span>دریافت ایمیل‌های تبلیغاتی و تخفیف‌ها</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsOptIn}
                    onChange={(e) => setSmsOptIn(e.target.checked)}
                    className="rounded border-[var(--border)]"
                  />
                  <span>دریافت پیامک‌های تبلیغاتی</span>
                </label>
              </div>
              <Button
                variant="outline"
                className="text-xs px-3 py-1"
                disabled={savingProfile}
                onClick={saveProfilePreferences}
              >
                {savingProfile ? "در حال ذخیره…" : "ذخیره ترجیحات"}
              </Button>
            </div>

            {/* ۱۰ سفارش آخر */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--foreground)]">سفارش‌های اخیر مشتری</p>
              {detail.orders.length === 0 ? (
                <p className="text-xs text-[var(--muted)]">هنوز سفارشی ثبت نکرده است.</p>
              ) : (
                <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                  <Table>
                    <THead>
                      <TR>
                        <TH>شماره</TH>
                        <TH>وضعیت</TH>
                        <TH>وضعیت پرداخت</TH>
                        <TH>مبلغ</TH>
                        <TH>تاریخ</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {detail.orders.map((o) => (
                        <TR key={o.id}>
                          <TD dir="ltr" className="font-mono text-xs font-medium">
                            {o.number}
                          </TD>
                          <TD className="text-xs">{o.status}</TD>
                          <TD className="text-xs">{o.paymentStatus}</TD>
                          <TD className="text-xs font-medium">{faMoney(Number(o.total))}</TD>
                          <TD className="text-xs opacity-70">{faDate(o.createdAt)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </div>

            {/* ثبت و مشاهده یادداشت‌های پشتیبانی / ادمین */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-[var(--foreground)]">یادداشت‌های داخلی و پشتیبانی</p>
              <form onSubmit={submitNote} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-1">
                    <Label>نوع یادداشت</Label>
                    <Select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as any)}
                    >
                      <option value="GENERAL">عمومی</option>
                      <option value="SUPPORT">پشتیبانی</option>
                      <option value="RISK">ریسک و تقلب</option>
                      <option value="MARKETING">بازاریابی</option>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Label>متن یادداشت</Label>
                    <Input
                      required
                      placeholder="متن یادداشت داخلی درباره این مشتری…"
                      value={noteBody}
                      onChange={(e) => setNoteBody(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={savingNote} className="text-xs px-3 py-1.5">
                    {savingNote ? "در حال ثبت…" : "افزودن یادداشت"}
                  </Button>
                </div>
              </form>

              <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-[var(--border)] p-2">
                {detail.notes.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] text-center py-3">
                    هیچ یادداشتی برای این کاربر ثبت نشده است.
                  </p>
                ) : (
                  detail.notes.map((n) => (
                    <div
                      key={n.id}
                      className="rounded bg-[var(--panel-2)] p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                        <span className="font-semibold text-sky-600 dark:text-sky-400">
                          {noteTypeLabels[n.type] ?? n.type}
                        </span>
                        <span>{faDate(n.createdAt)}</span>
                      </div>
                      <p className="text-[var(--foreground)] leading-relaxed">{n.body}</p>
                      {n.actorEmail && (
                        <p className="text-[10px] text-[var(--muted)]" dir="ltr">
                          توسط: {n.actorEmail}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
