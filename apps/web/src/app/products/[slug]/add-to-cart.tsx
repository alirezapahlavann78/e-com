"use client";
import { useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
function token() { if (typeof window === "undefined") return ""; let t = localStorage.getItem("guest_cart_token"); if (!t) { t = crypto.randomUUID(); localStorage.setItem("guest_cart_token", t); } return t; }
export function AddToCartButton({ productId }: { productId: string }) {
  const [msg, setMsg] = useState("");
  async function add() {
    setMsg("");
    const res = await fetch(`${API}/cart/items?guestToken=${encodeURIComponent(token())}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, quantity: 1 }) });
    setMsg(res.ok ? "به سبد اضافه شد" : await res.text());
  }
  return <div className="mt-6"><button onClick={add} className="rounded-xl bg-stone-900 px-5 py-3 text-white">افزودن به سبد</button>{msg ? <p className="mt-2 text-sm text-stone-600 whitespace-pre-wrap">{msg}</p> : null}</div>;
}
