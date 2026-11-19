"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { adminApi, faDate } from "../../lib/api";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select, Spinner } from "../../components/ui";

type MediaAsset = {
  id: string;
  key: string;
  url: string;
  mimeType: string;
  size: number;
  alt: string | null;
  folder: string | null;
  tags: string[];
  createdAt: string;
};

const MAX_BYTES = 8 * 1024 * 1024;

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود"));
    reader.readAsDataURL(file);
  });
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editAlt, setEditAlt] = useState("");
  const [editFolder, setEditFolder] = useState("");
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    const params = new URLSearchParams();
    if (folder) params.set("folder", folder);
    if (query.trim()) params.set("q", query.trim());
    try {
      const [items, folderList] = await Promise.all([
        adminApi<MediaAsset[]>(`/admin/media?${params.toString()}`),
        adminApi<string[]>("/admin/media/folders"),
      ]);
      setAssets(items);
      setFolders(folderList);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در دریافت رسانه‌ها");
      setAssets([]);
    }
  }, [folder, query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    setError("");
    setNotice("");
    let uploaded = 0;
    for (const file of list) {
      if (file.size > MAX_BYTES) {
        setError(`«${file.name}» بزرگ‌تر از ۸ مگابایت است.`);
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        await adminApi<MediaAsset>("/admin/media/upload", {
          method: "POST",
          body: JSON.stringify({
            dataUrl,
            filename: file.name,
            mimeType: file.type || "image/jpeg",
            folder: folder || "products",
          }),
        });
        uploaded += 1;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : `آپلود «${file.name}» ناموفق بود`);
      }
    }
    setUploading(false);
    if (uploaded) setNotice(`${uploaded} فایل با موفقیت آپلود شد.`);
    await load();
  }

  async function remove(asset: MediaAsset) {
    if (!window.confirm(`«${asset.key.split("/").pop()}» حذف شود؟`)) return;
    try {
      await adminApi(`/admin/media/${asset.id}`, { method: "DELETE" });
      setAssets((items) => (items ?? []).filter((item) => item.id !== asset.id));
      setNotice("فایل حذف شد.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "حذف ناموفق بود");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const updated = await adminApi<MediaAsset>(`/admin/media/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ alt: editAlt || undefined, folder: editFolder || undefined }),
      });
      setAssets((items) => (items ?? []).map((item) => (item.id === updated.id ? updated : item)));
      setEditing(null);
      setNotice("اطلاعات فایل ذخیره شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ذخیره ناموفق بود");
    }
  }

  async function copy(asset: MediaAsset) {
    const absolute = typeof window === "undefined" ? asset.url : `${window.location.origin}${asset.url}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setNotice("آدرس تصویر کپی شد.");
    } catch {
      window.prompt("آدرس تصویر:", absolute);
    }
  }

  const stats = useMemo(() => {
    const list = assets ?? [];
    const total = list.reduce((sum, asset) => sum + asset.size, 0);
    return { count: list.length, size: humanSize(total) };
  }, [assets]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">کتابخانه رسانه</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            تصاویر محصولات، بنرها و فایل‌های صفحه‌ساز — همه در دیتابیس ثبت می‌شوند و از همین‌جا در صفحه‌ساز قابل انتخاب‌اند.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{stats.count} فایل</Badge>
          <Badge variant="neutral">{stats.size}</Badge>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "در حال آپلود…" : "افزودن فایل"}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,video/mp4"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {error ? <p className="rounded-xl bg-[var(--danger)]/10 px-3 py-2 text-[12px] text-[var(--danger)]">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-[var(--accent)]/10 px-3 py-2 text-[12px]">{notice}</p> : null}

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files?.length) void uploadFiles(event.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border border-dashed p-6 text-center transition ${
          dragging ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] bg-[var(--panel)]"
        }`}
      >
        <p className="text-sm font-semibold">فایل را اینجا رها کنید یا کلیک کنید</p>
        <p className="mt-1 text-[11px] text-[var(--muted)]">JPG، PNG، WEBP، SVG، PDF، MP4 — حداکثر ۸ مگابایت</p>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[220px] flex-1">
            <Input placeholder="جستجو در نام، آدرس یا توضیح جایگزین…" value={query} onChange={(engine) => setQuery(engine.target.value)} />
          </div>
          <div className="w-48">
            <Select
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              aria-label="پوشه"
            >
              <option value="">همه پوشه‌ها</option>
              {folders.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="ghost" onClick={() => void load()}>
            به‌روزرسانی
          </Button>
        </div>
      </Card>

      {assets === null ? (
        <div className="flex justify-center p-12">
          <Spinner className="h-7 w-7" />
        </div>
      ) : assets.length === 0 ? (
        <EmptyState title="تصویری یافت نشد" description="اولین فایل را آپلود کنید تا در محصولات و صفحه‌ساز استفاده شود." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
              <button type="button" onClick={() => setPreview(asset)} className="block h-36 w-full overflow-hidden bg-[var(--border)]/40">
                {asset.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={asset.alt ?? ""} className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
                ) : (
                  <span className="flex h-full items-center justify-center text-[11px] text-[var(--muted)]">{asset.mimeType}</span>
                )}
              </button>
              <div className="space-y-2 p-3">
                <p className="truncate text-[12px] font-semibold" dir="ltr" title={asset.key}>
                  {asset.key.split("/").pop()}
                </p>
                <div className="flex items-center justify-between text-[10.5px] text-[var(--muted)]">
                  <span dir="ltr">{humanSize(asset.size)}</span>
                  <span>{faDate(asset.createdAt)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {asset.folder ? <Badge variant="neutral">{asset.folder}</Badge> : null}
                  {asset.alt ? <Badge variant="success">alt</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Button variant="ghost" className="px-2 py-1 text-[11px]" onClick={() => void copy(asset)}>
                    کپی آدرس
                  </Button>
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-[11px]"
                    onClick={() => {
                      setEditing(asset);
                      setEditAlt(asset.alt ?? "");
                      setEditFolder(asset.folder ?? "");
                    }}
                  >
                    ویرایش
                  </Button>
                  <Button variant="ghost" className="px-2 py-1 text-[11px] text-[var(--danger)]" onClick={() => void remove(asset)}>
                    حذف
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="ویرایش فایل" footer={<Button onClick={() => void saveEdit()}>ذخیره</Button>}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="media-alt">توضیح تصویر (alt)</Label>
            <Input id="media-alt" value={editAlt} onChange={(event) => setEditAlt(event.target.value)} placeholder="مثلاً: مانتو کتان کرم — نمای جلو" />
          </div>
          <div>
            <Label htmlFor="media-folder">پوشه</Label>
            <Input id="media-folder" dir="ltr" value={editFolder} onChange={(event) => setEditFolder(event.target.value)} placeholder="products" />
          </div>
          {editing ? <p className="text-[11px] text-[var(--muted)]" dir="ltr">{editing.url}</p> : null}
        </div>
      </Modal>

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title="پیش‌نمایش فایل">
        {preview ? (
          <div className="space-y-3">
            {preview.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.alt ?? ""} className="max-h-[60vh] w-full rounded-xl object-contain" />
            ) : (
              <a href={preview.url} target="_blank" rel="noreferrer" className="text-sm underline">
                باز کردن فایل در تب جدید
              </a>
            )}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[var(--muted)]">
              <p dir="ltr" className="truncate">{preview.key}</p>
              <p>{humanSize(preview.size)}</p>
            </div>
            <Button variant="ghost" onClick={() => void copy(preview)}>
              کپی آدرس تصویر
            </Button>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
