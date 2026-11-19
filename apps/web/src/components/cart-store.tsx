"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export function guestToken(): string {
  if (typeof window === "undefined") return "";
  let t = localStorage.getItem("guest_cart_token");
  if (!t) { t = crypto.randomUUID(); localStorage.setItem("guest_cart_token", t); }
  return t;
}

export function guestFetch(path: string, init?: RequestInit): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = typeof window !== "undefined" && localStorage.getItem("access_token");
  if (auth) headers.Authorization = `Bearer ${localStorage.getItem("access_token")}`;
  return fetch(`${API}${path}${sep}guestToken=${encodeURIComponent(guestToken())}`, { ...init, headers }).then(async (res) => {
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    return text ? JSON.parse(text) : null;
  });
}

/** Shared cart state hook — polls the cart API and keeps a cached summary for the header badge. */
export function useCart() {
  const [cart, setCart] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    guestFetch("/cart").then((c) => { if (alive) setCart(c); }).catch(() => {});
    const onChange = () => guestFetch("/cart").then((c) => { if (alive) setCart(c); }).catch(() => {});
    window.addEventListener("cart-changed", onChange);
    return () => { alive = false; window.removeEventListener("cart-changed", onChange); };
  }, []);

  return cart;
}

export function notifyCartChanged() {
  window.dispatchEvent(new Event("cart-changed"));
}
