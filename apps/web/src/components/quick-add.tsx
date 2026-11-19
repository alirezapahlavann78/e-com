"use client";

import { useState } from "react";

import { addToCart } from "./cart-store";

export function QuickAdd({
  productId,
  variantId,
  hasVariants,
  slug,
}: {
  productId: string;
  variantId?: string;
  hasVariants: boolean;
  slug: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  if (hasVariants) {
    return (
      <a
        href={`/products/${slug}`}
        aria-label="انتخاب سایز"
        className="quick-add flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--panel)] text-[var(--ink)] shadow-md ring-1 ring-[var(--line)] transition hover:bg-[var(--ink)] hover:text-white"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </a>
    );
  }

  return (
    <button
      type="button"
      aria-label="افزودن به سبد"
      disabled={state === "loading"}
      onClick={async () => {
        setState("loading");
        try {
          await addToCart(productId, variantId ?? null, 1);
          setState("done");
          setTimeout(() => setState("idle"), 1600);
        } catch {
          setState("error");
          setTimeout(() => setState("idle"), 1600);
        }
      }}
      className="quick-add flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--panel)] text-[var(--ink)] shadow-md ring-1 ring-[var(--line)] transition hover:bg-[var(--ink)] hover:text-white"
    >
      {state === "done" ? (
        "✓"
      ) : state === "error" ? (
        "!"
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M12 5v14M5 12h14" />
        </svg>
      )}
    </button>
  );
}
