"use client";

import { useRouter } from "next/navigation";

import type { CatalogParams } from "./catalog-view";

export function CatalogToolbar({
  basePath,
  params,
  sortLabels,
}: {
  basePath: string;
  params: CatalogParams;
  sortLabels: Record<string, string>;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label className="hidden text-[11px] text-[var(--muted)] sm:block" htmlFor="catalog-sort">
        ترتیب:
      </label>
      <select
        id="catalog-sort"
        defaultValue={params.sort ?? ""}
        onChange={(event) => {
          const next = new URLSearchParams();
          const merged = { ...params, sort: event.target.value || undefined, page: undefined };
          for (const [key, value] of Object.entries(merged)) {
            if (value) next.set(key, value);
          }
          const query = next.toString();
          router.push(query ? `${basePath}?${query}` : basePath);
        }}
        className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-xs"
      >
        <option value="">پیشنهاد آگاهی</option>
        {Object.entries(sortLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
