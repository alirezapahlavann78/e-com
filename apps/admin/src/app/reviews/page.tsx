"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import {
  Badge,
  Button,
  Card,
  EmptyState,
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

interface ProductReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  isVerified: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
  };
  user?: {
    id: string;
    email: string;
  } | null;
  images?: { id: string; url: string; alt: string | null }[];
}

interface ReviewsResponse {
  items: ProductReviewItem[];
  total: number;
  page: number;
  limit: number;
}

const statusOptions = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "PENDING", label: "در انتظار بررسی" },
  { value: "APPROVED", label: "تأیید و منتشرشده" },
  { value: "REJECTED", label: "رد شده" },
];

const faNum = (n: number) => n.toLocaleString("fa-IR");
const faDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString("fa-IR");
  } catch {
    return d;
  }
};

export default function ReviewsPage() {
  const [items, setItems] = useState<ProductReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      const data = await adminApi<ReviewsResponse>(`/admin/reviews?${params.toString()}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت نظرات کاربران");
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const setReviewStatus = async (id: string, newStatus: "APPROVED" | "REJECTED") => {
    setModeratingId(id);
    try {
      await adminApi(`/admin/reviews/${id}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "خطا در تغییر وضعیت نظر");
    } finally {
      setModeratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">مدیریت نظرات محصولات</h1>
          <p className="text-sm opacity-60">
            {faNum(total)} دیدگاه ثبت‌شده برای محصولات فروشگاه
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
            title="هیچ دیدگاهی یافت نشد"
            description="دیدگاهی مطابق فیلتر فعلی وجود ندارد."
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>محصول</TH>
                  <TH>امتیاز و نویسنده</TH>
                  <TH>متن نظر</TH>
                  <TH>وضعیت</TH>
                  <TH>تاریخ</TH>
                  <TH>عملیات مدیریت</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium">
                      <div>{r.product.name}</div>
                      <span className="text-xs opacity-50" dir="ltr">
                        {r.product.slug}
                      </span>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1 font-bold text-amber-500">
                        <span>★ {r.rating}</span>
                      </div>
                      <div className="text-xs text-[var(--muted)]">
                        {r.authorName}
                        {r.isVerified ? (
                          <span className="mr-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                            (خریدار تأییدشده)
                          </span>
                        ) : null}
                      </div>
                    </TD>
                    <TD className="max-w-md">
                      {r.title ? <p className="font-semibold text-xs">{r.title}</p> : null}
                      <p className="text-xs text-[var(--muted)] line-clamp-2">{r.body || "—"}</p>
                      {r.images?.length ? (
                        <div className="mt-2 flex gap-1.5">
                          {r.images.map((image) => (
                            <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="block h-10 w-10 overflow-hidden rounded-md border border-[var(--border)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={image.url} alt={image.alt ?? ""} className="h-full w-full object-cover" />
                            </a>
                          ))}
                          <span className="self-end text-[10px] text-[var(--muted)]">{r.images.length.toLocaleString("fa-IR")} عکس</span>
                        </div>
                      ) : null}
                    </TD>
                    <TD>
                      {r.status === "APPROVED" ? (
                        <Badge variant="success">تأییدشده</Badge>
                      ) : r.status === "REJECTED" ? (
                        <Badge variant="danger">ردشده</Badge>
                      ) : (
                        <Badge variant="warn">در انتظار بررسی</Badge>
                      )}
                    </TD>
                    <TD className="text-xs opacity-70">{faDate(r.createdAt)}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        {r.status !== "APPROVED" ? (
                          <Button
                            variant="primary"
                            className="px-2.5 py-1 text-xs"
                            disabled={moderatingId === r.id}
                            onClick={() => setReviewStatus(r.id, "APPROVED")}
                          >
                            تأیید
                          </Button>
                        ) : null}
                        {r.status !== "REJECTED" ? (
                          <Button
                            variant="danger"
                            className="px-2.5 py-1 text-xs"
                            disabled={moderatingId === r.id}
                            onClick={() => setReviewStatus(r.id, "REJECTED")}
                          >
                            رد
                          </Button>
                        ) : null}
                      </div>
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
    </div>
  );
}
