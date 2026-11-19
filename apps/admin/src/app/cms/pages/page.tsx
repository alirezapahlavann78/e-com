"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { adminApi, faDateTime } from "../../../lib/api";
import { Badge, Button, Card, Input, Label, Select, Spinner } from "../../../components/ui";

type PageRow = {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  updatedAt: string;
  publishedVersion?: { version: number } | null;
  draftVersion?: { version: number } | null;
};

const TYPE_LABELS: Record<string, string> = {
  HOME: "خانه",
  STATIC: "صفحه ثابت",
  LANDING: "لندینگ",
  CUSTOM: "سفارشی",
  PRODUCT_TEMPLATE: "قالب محصول",
  CATEGORY_TEMPLATE: "قالب دسته",
  BRAND: "برند",
};

export default function CmsPagesList() {
  const [items, setItems] = useState<PageRow[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", type: "STATIC" });

  const load = async () => {
    try {
      setItems(await adminApi<PageRow[]>("/admin/cms/pages"));
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const page = await adminApi<{ id: string }>("/admin/cms/pages", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          slug: form.slug || form.title.toLowerCase().replace(/\s+/g, "-"),
          type: form.type,
          status: "DRAFT",
          sections: [
            {
              type: "rich_text",
              config: {
                eyebrow: "آگاهی",
                title: form.title,
                body: "این متن را از صفحه‌ساز ویرایش کنید.",
              },
            },
          ],
        }),
      });
      window.location.href = `/cms/pages/${page.id}`;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: PageRow) => {
    if (!window.confirm(`صفحه «${row.title}» حذف شود؟`)) return;
    try {
      await adminApi(`/admin/cms/pages/${row.id}`, { method: "DELETE" });
      setNotice(`صفحه «${row.title}» حذف شد.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!items) {
    return (
      <div className="flex h-72 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  const published = items.filter((item) => item.status === "PUBLISHED").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--accent)]">PAGE BUILDER</p>
          <h1 className="mt-1 text-lg font-bold">صفحه‌ها و قالب‌ها</h1>
          <p className="mt-1 text-[11.5px] text-[var(--muted)]">
            {items.length} صفحه · {published} منتشرشده — همه بخش‌ها در دیتابیس ذخیره و در فروشگاه رندر می‌شوند.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ صفحه جدید</Button>
      </div>

      {notice ? <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-[12px] text-[var(--success)]">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-[12px] text-[var(--danger)]">{error}</div> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((row) => (
          <Card key={row.id} className="group flex flex-col justify-between p-4 transition hover:border-[var(--accent)]/60">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-[13px] font-bold">{row.title}</h2>
                  <p className="mt-0.5 truncate text-[10.5px] text-[var(--muted)]" dir="ltr">
                    /{row.slug}
                  </p>
                </div>
                <Badge variant={row.status === "PUBLISHED" ? "success" : "warn"}>{row.status === "PUBLISHED" ? "منتشرشده" : "پیش‌نویس"}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--muted)]">
                <span className="rounded-md bg-[var(--panel-2)] px-1.5 py-0.5">{TYPE_LABELS[row.type] ?? row.type}</span>
                {row.publishedVersion ? <span>منتشر: v{row.publishedVersion.version}</span> : <span>بدون نسخه منتشرشده</span>}
                {row.draftVersion ? <span>· پیش‌نویس: v{row.draftVersion.version}</span> : null}
              </div>
              <p className="mt-2 text-[10px] text-[var(--muted)]">آخرین ویرایش {faDateTime(row.updatedAt)}</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Link
                href={`/cms/pages/${row.id}`}
                className="flex-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-center text-[11.5px] font-semibold text-[var(--accent-ink)] hover:brightness-95"
              >
                ویرایش در صفحه‌ساز
              </Link>
              <button type="button" onClick={() => remove(row)} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--danger)] hover:bg-[var(--danger)]/10">
                حذف
              </button>
            </div>
          </Card>
        ))}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold">صفحه جدید</h2>
            <p className="mt-1 text-[11px] text-[var(--muted)]">پس از ساخت، در صفحه‌ساز بخش‌ها را اضافه کنید.</p>
            <div className="mt-4 space-y-3">
              <div>
                <Label>عنوان</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="راهنمای سایز" />
              </div>
              <div>
                <Label>اسلاگ</Label>
                <Input value={form.slug} dir="ltr" onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="size-guide" />
              </div>
              <div>
                <Label>نوع</Label>
                <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>انصراف</Button>
              <Button onClick={create} disabled={busy || !form.title.trim()}>
                {busy ? "در حال ساخت…" : "ساخت و ورود به صفحه‌ساز"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
