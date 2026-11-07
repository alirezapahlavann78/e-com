"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export default function SandboxVerify() {
  const sp = useSearchParams();
  const reference = sp.get("reference") ?? "";
  const [result, setResult] = useState<any>(null);
  useEffect(() => { if (!reference) return; fetch(`${API}/checkout/sandbox/verify?reference=${encodeURIComponent(reference)}`).then(r=>r.json()).then(setResult); }, [reference]);
  return <main className="mx-auto max-w-3xl px-6 py-12"><h1 className="text-3xl font-semibold">Sandbox Payment</h1><p className="mt-3 text-stone-700">Reference: {reference}</p><pre className="mt-6 overflow-auto rounded-xl bg-stone-100 p-4 text-xs">{JSON.stringify(result, null, 2)}</pre></main>;
}
