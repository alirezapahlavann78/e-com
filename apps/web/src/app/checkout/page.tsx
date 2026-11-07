"use client";
import { useState } from "react";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
function token() { if (typeof window === "undefined") return ""; let t = localStorage.getItem("guest_cart_token"); if (!t) { t = crypto.randomUUID(); localStorage.setItem("guest_cart_token", t); } return t; }

export default function CheckoutPage() {
  const [email, setEmail] = useState("buyer@example.com");
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");
  async function submit() {
    setErr("");
    try {
      const res = await fetch(`${API}/checkout?guestToken=${encodeURIComponent(token())}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, shippingAddress: { fullName: "مشتری نمونه", province: "تهران", city: "تهران", address1: "خیابان نمونه", country: "IR" } }) });
      const data = await res.json(); if (!res.ok) throw new Error(JSON.stringify(data)); setResult(data);
    } catch (e: any) { setErr(e.message); }
  }
  return <main className="mx-auto max-w-3xl px-6 py-12"><h1 className="text-3xl font-semibold">تسویه حساب (Sandbox)</h1><div className="mt-6 space-y-3 rounded-2xl border border-stone-200 bg-white p-5"><input className="w-full rounded-lg border p-3" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" /><button onClick={submit} className="rounded-xl bg-stone-900 px-5 py-3 text-white">ثبت سفارش و پرداخت آزمایشی</button>{err ? <pre className="whitespace-pre-wrap text-sm text-red-700">{err}</pre> : null}{result ? <div className="rounded-xl bg-stone-50 p-4 text-sm"><div>سفارش: {result.order?.number}</div><a className="text-[var(--accent)] underline" href={`/checkout/sandbox?reference=${encodeURIComponent(result.payment?.reference ?? "")}`}>رفتن به تایید پرداخت Sandbox</a><pre className="mt-2 overflow-auto text-xs">{JSON.stringify(result.payment, null, 2)}</pre></div> : null}</div></main>;
}
