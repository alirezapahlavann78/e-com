"use client";

import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type CartItem = {
  id: string;
  quantity: number;
  unitPrice: string | number;
  product: { id: string; name: string; slug: string; basePrice: string | null; images: { url: string }[] };
  variant?: { id: string; title: string | null; sku: string; price: string | null; imageUrl: string | null } | null;
};

export type CartSummary = {
  itemsCount?: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  freeShipping?: boolean;
  shippingAmount?: number;
  freeShippingRemaining?: number;
  taxAmount?: number;
  discountError?: string | null;
  discountCode?: { code: string } | null;
};

export type Cart = {
  id: string;
  items: CartItem[];
  discountCode?: { id: string; code: string; type: string; value: string } | null;
  summary?: CartSummary;
};

export function guestToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem("guest_cart_token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("guest_cart_token", token);
  }
  return token;
}

export function accessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function authHeaders(): Record<string, string> {
  const token = accessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function guestFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...((init?.headers as Record<string, string>) ?? {}),
  };
  return fetch(`${API}${path}${separator}guestToken=${encodeURIComponent(guestToken())}`, {
    ...init,
    headers,
  }).then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      let message = text;
      try {
        const parsed = JSON.parse(text);
        message = parsed.message ?? text;
      } catch {
        /* keep raw */
      }
      throw new Error(message || res.statusText);
    }
    return (text ? JSON.parse(text) : null) as T;
  });
}

export function notifyCartChanged() {
  window.dispatchEvent(new Event("cart-changed"));
}

export async function addToCart(productId: string, variantId?: string | null, quantity = 1) {
  await guestFetch("/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, variantId: variantId ?? undefined, quantity }),
  });
  notifyCartChanged();
}

/** Cart state shared by the header badge and the cart page. */
export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const next = await guestFetch<Cart>("/cart");
      setCart(next);
      return next;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onChange = () => void reload();
    window.addEventListener("cart-changed", onChange);
    return () => window.removeEventListener("cart-changed", onChange);
  }, [reload]);

  return { cart, loading, reload };
}
