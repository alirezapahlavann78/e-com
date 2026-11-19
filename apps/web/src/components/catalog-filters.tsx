"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { formatPrice } from "../lib/format";

/** Two numeric price inputs that rewrite minPrice/maxPrice while keeping the other filters. */
export function PriceFilter({ basePath, hintMax }: { basePath: string; hintMax?: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [min, setMin] = useState(searchParams.get("minPrice") ?? "");
  const [max, setMax] = useState(searchParams.get("maxPrice") ?? "");

  function apply(nextMin: string, nextMax: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextMin) next.set("minPrice", nextMin.replace(/[^\d]/g, ""));
    else next.delete("minPrice");
    if (nextMax) next.set("maxPrice", nextMax.replace(/[^\d]/g, ""));
    else next.delete("maxPrice");
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply(min, max);
      }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <input
          inputMode="numeric"
          value={min}
          onChange={(event) => setMin(event.target.value)}
          placeholder="از"
          aria-label="حداقل قیمت"
          className="field h-9 w-full px-2.5 py-1 text-[11.5px]"
        />
        <span className="text-[var(--muted)]">—</span>
        <input
          inputMode="numeric"
          value={max}
          onChange={(event) => setMax(event.target.value)}
          placeholder="تا"
          aria-label="حداکثر قیمت"
          className="field h-9 w-full px-2.5 py-1 text-[11.5px]"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] text-[var(--muted)]">{hintMax ? `بیشینه ${formatPrice(hintMax)}` : "به تومان"}</span>
        <button type="submit" className="btn btn-outline px-3 py-1 text-[11px]">
          اعمال
        </button>
      </div>
    </form>
  );
}
