"use client";
import { useState } from "react";
import { guestFetch, notifyCartChanged } from "../../../components/cart-store";

export function AddToCartButton({ productId }: { productId: string }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function add() {
    setMsg("");
    setLoading(true);
    try {
      await guestFetch("/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity: 1 }) });
      notifyCartChanged();
      setMsg("به سبد اضافه شد ✓");
    } catch (e: any) { setMsg("افزودن به سبد ناموفق بود."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <button onClick={add} disabled={loading} className="rounded-full bg-[var(--accent)] px-10 py-4 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60">
        {loading ? "در حال افزودن…" : "افزودن به سبد خرید"}
      </button>
      {msg ? <p className="mt-2 text-sm text-[var(--muted)]">{msg}</p> : null}
    </div>
  );
}
