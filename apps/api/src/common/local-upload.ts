import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";

/** Root folder for locally uploaded files (served at /uploads by main.ts). */
export const UPLOAD_ROOT = resolve(process.cwd(), "uploads");

export const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
};

export const slugifyFile = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "file";

export type StoredFile = { url: string; key: string; mimeType: string; size: number };

/**
 * Decodes a base64 data URL and writes it under `uploads/<folder>/`.
 * Shared by the admin media library and the public review-photo upload.
 */
export async function saveDataUrl(
  dataUrl: string,
  options: { folder: string; mimeType?: string; filename?: string; maxBytes?: number },
): Promise<StoredFile> {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl) ?? null;
  const base64 = (match ? match[2] : dataUrl.replace(/^data:[^,]*,/, "")) ?? "";
  const mimeType = options.mimeType ?? match?.[1] ?? "application/octet-stream";
  if (!EXT_BY_MIME[mimeType] && !mimeType.startsWith("image/")) {
    throw new BadRequestException("Only images, PDF and MP4 files can be uploaded");
  }

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) throw new BadRequestException("Empty file");
  const maxBytes = options.maxBytes ?? 8 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new BadRequestException(`File is larger than ${Math.round(maxBytes / (1024 * 1024))} MB`);
  }

  const folder = slugifyFile(options.folder || "uploads");
  const original = slugifyFile(options.filename ?? `${Date.now()}`);
  const ext = EXT_BY_MIME[mimeType] ?? (extname(original) || ".bin");
  const base = original.endsWith(ext) ? original.slice(0, -ext.length) : original;
  const key = `${folder}/${Date.now()}-${base}-${randomUUID().slice(0, 6)}${ext}`;

  const absolute = join(UPLOAD_ROOT, ...key.split("/"));
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, buffer);

  return { url: `/uploads/${key}`, key, mimeType, size: buffer.length };
}
