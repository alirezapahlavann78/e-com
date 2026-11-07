"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, setAdminTokens } from "../../lib/api";

export default function AdminLogin() {
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_ADMIN_BOOTSTRAP_EMAIL ?? "admin@aghaci.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit() {
    setError("");
    try {
      const res = await adminApi<{ accessToken: string; refreshToken: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setAdminTokens(res.accessToken, res.refreshToken); router.push("/cms/pages");
    } catch (e: any) { setError(e.message || "Login failed"); }
  }
  return <main className="mx-auto max-w-md px-6 py-16"><h1 className="text-3xl font-semibold">Admin Login</h1><div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-[var(--panel)] p-5"><input className="w-full rounded-lg bg-black/20 p-3" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" /><input className="w-full rounded-lg bg-black/20 p-3" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" /><button onClick={submit} className="w-full rounded-lg bg-sky-400 p-3 font-medium text-slate-900">Login</button>{error ? <p className="whitespace-pre-wrap text-sm text-red-300">{error}</p> : null}</div></main>;
}
