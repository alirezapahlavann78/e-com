"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "../../components/theme-toggle";
import { Button, Input, Label } from "../../components/ui";
import { adminApi, setAdminTokens } from "../../lib/api";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@aghaci.local");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section
        className="relative hidden overflow-hidden bg-[#191512] p-14 text-[#f3ece2] lg:flex lg:flex-col lg:justify-between"
        style={{ backgroundImage: "url(/media/hero/atelier.jpg)", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#15110d]/95 via-[#15110d]/70 to-[#15110d]/35" />
        <div className="relative">
          <p className="text-[11px] tracking-[0.4em] text-[#d9b98f]">AGHACI · ADMIN</p>
          <h1 className="mt-8 max-w-md text-4xl font-bold leading-[1.35]">
            مدیریت فروشگاه،
            <br />
            از ایده تا ارسال.
          </h1>
          <p className="mt-5 max-w-sm text-[13px] leading-7 text-[#d6cabd]">
            سفارش‌ها، موجودی، مشتریان و صفحه‌ساز تصویری — همه در یک پنل، متصل به داده واقعی فروشگاه.
          </p>
        </div>
        <div className="relative grid max-w-sm grid-cols-3 gap-4 border-t border-white/15 pt-6 text-[11px] text-[#cdbfae]">
          <div>
            <p className="text-lg font-bold text-white">آنی</p>
            <p className="mt-1">به‌روزرسانی موجودی</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">زنده</p>
            <p className="mt-1">پیش‌نمایش صفحه‌ساز</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">امن</p>
            <p className="mt-1">دسترسی نقش‌محور</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-[var(--background)] px-5 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-lg font-bold text-[var(--accent-ink)]">آ</span>
              <div>
                <p className="text-[13px] font-bold tracking-[0.3em]">AGHACI</p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">پنل مدیریت فروشگاه</p>
              </div>
            </div>
            <ThemeToggle />
          </div>

          <h2 className="text-xl font-bold">خوش برگشتید</h2>
          <p className="mt-1 text-[12px] text-[var(--muted)]">برای ادامه وارد حساب مدیریتی خود شوید.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">ایمیل</Label>
              <Input id="email" dir="ltr" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">رمز عبور</Label>
              <Input id="password" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error ? <p className="rounded-xl bg-[var(--danger)]/10 px-3 py-2 text-[12px] text-[var(--danger)]">{error}</p> : null}
            <Button type="submit" className="w-full py-2.5" disabled={busy}>
              {busy ? "در حال ورود…" : "ورود به پنل"}
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3 text-[11px] leading-5 text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">حساب نمایشی مدیر</p>
            <p dir="ltr" className="mt-1">admin@aghaci.local · Admin@12345</p>
          </div>
        </div>
      </section>
    </main>
  );
}
