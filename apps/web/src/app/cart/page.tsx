"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
function token() { if (typeof window === "undefined") return ""; let t = localStorage.getItem("guest_cart_token"); if (!t) { t = crypto.randomUUID(); localStorage.setItem("guest_cart_token", t); } return t; }
async function api(path: string, init?: RequestInit) { const res = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}guestToken=${encodeURIComponent(token())}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } }); if (!res.ok) throw new Error(await res.text()); return res.json(); }

export default function CartPage() {
  const [cart, setCart] = useState<any>(null);
  const [err, setErr] = useState("");
  const load = async () => { try { setCart(await api("/cart")); } catch (e: any) { setErr(e.message); } };
  useEffect(() => { load(); }, []);
  const remove = async (id: string) => { await api(`/cart/items/${id}`, { method: "DELETE" }); load(); };
  if (!cart) return <main className="mx-auto max-w-4xl px-6 py-12">Loading... {err}</main>;
  return <main className="mx-auto max-w-4xl px-6 py-12"><h1 className="text-3xl font-semibold">سبد خرید</h1><div className="mt-6 space-y-3">{cart.items?.map((i: any) => <div key={i.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4"><div><div className="font-medium">{i.product?.name}</div><div className="text-sm text-stone-600">{i.quantity} × {i.unitPrice}</div></div><button onClick={()=>remove(i.id)} className="text-sm text-red-700">حذف</button></div>)}</div><div className="mt-6 rounded-xl bg-stone-100 p-4">جمع: {cart.summary?.total}</div><Link href="/checkout" className="mt-4 inline-block rounded-xl bg-stone-900 px-5 py-3 text-white">ادامه تسویه حساب</Link></main>;
}
