"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi, setAdminTokens } from "../../lib/api";
import { Button, Input, Label } from "../../components/ui";
import { ThemeToggle } from "../../components/theme-toggle";

export default function AdminLogin() {
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_ADMIN_BOOTSTRAP_EMAIL ?? "admin@aghaci.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await adminApi<{ accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAdminTokens(res.accessToken, res.refreshToken);
      router.push("/");
    } catch {
      setError("ورود ناموفق بود. ایمیل یا رمز عبور را بررسی کنید.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="absolute left-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-xl font-bold text-white shadow-lg dark:bg-sky-400 dark:text-slate-900">آ</span>
          <div className="text-center">
            <p className="text-lg font-bold tracking-[0.35em] text-[var(--foreground)]">AGHACI</p>
            <p className="mt-1 text-xs text-[var(--muted)]">پنل مدیریت فروشگاه</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-xl">
          <div>
            <Label htmlFor="email">ایمیل</Label>
            <Input id="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@aghaci.local" required />
          </div>
          <div>
            <Label htmlFor="password">رمز عبور</Label>
            <Input id="password" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error ? <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "در حال ورود..." : "ورود به پنل"}</Button>
        </form>
      </div>
    </main>
  );
}
