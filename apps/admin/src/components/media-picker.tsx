"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { adminApi } from "../lib/api";
import { Button, EmptyState, Input, Modal, Spinner } from "./ui";

export type PickedAsset = { id: string; key: string; url: string; alt: string | null; folder: string | null; size: number; mimeType: string };

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود"));
    reader.readAsDataURL(file);
  });
}

/**
 * Modal image picker backed by the media library (DB + /uploads).
 * Used by the page builder so any block image can come from real uploaded files.
 */
export default function MediaPicker({
  open,
  onClose,
  onSelect,
  folder,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, asset: PickedAsset) => void;
  folder?: string;
}) {
  const [assets, setAssets] = useState<PickedAsset[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError("");
    const params = new URLSearchParams();
    if (folder) params.set("folder", folder);
    if (query.trim()) params.set("q", query.trim());
    try {
      setAssets(await adminApi<PickedAsset[]>(`/admin/media?${params.toString()}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در دریافت رسانه‌ها");
      setAssets([]);
    }
  }, [folder, query]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void load(), query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, load, query]);

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      const asset = await adminApi<PickedAsset>("/admin/media/upload", {
        method: "POST",
        body: JSON.stringify({
          dataUrl: await readAsDataUrl(file),
          filename: file.name,
          mimeType: file.type || "image/jpeg",
          folder: folder ?? "cms",
        }),
      });
      onSelect(asset.url, asset);
      onClose();
      setAssets(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "آپلود ناموفق بود");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="انتخاب تصویر از کتابخانه">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input placeholder="جستجو…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? "…" : "آپلود"}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </div>

        {error ? <p className="rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-[11px] text-[var(--danger)]">{error}</p> : null}

        {assets === null ? (
          <div className="flex justify-center p-8">
            <Spinner className="h-6 w-6" />
          </div>
        ) : assets.length === 0 ? (
          <EmptyState title="تصویری نیست" description="از دکمه آپلود استفاده کنید." />
        ) : (
          <div className="grid max-h-[46vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  onSelect(asset.url, asset);
                  onClose();
                }}
                className="group overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel-2)] text-left hover:border-[var(--accent)]"
                title={asset.alt ?? asset.key}
              >
                {asset.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt={asset.alt ?? ""} className="h-20 w-full object-cover" />
                ) : (
                  <span className="flex h-20 items-center justify-center text-[10px] text-[var(--muted)]">{asset.mimeType}</span>
                )}
                <span className="block truncate px-1.5 py-1 text-[9.5px] text-[var(--muted)]" dir="ltr">
                  {asset.key.split("/").pop()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
