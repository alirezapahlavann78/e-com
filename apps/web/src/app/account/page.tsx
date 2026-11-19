"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { accessToken, authHeaders } from "../../components/cart-store";
import { formatDate, formatPrice, statusFa } from "../../lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type User = { id: string; email: string; firstName?: string | null; lastName?: string | null; phone?: string | null };
type Order = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
  items?: { id: string; name: string; quantity: number; imageUrl?: string | null }[];
};
type WishlistItem = { id: string; product: { id: string; name: string; slug: string; basePrice: string | null; images?: { url: string }[] } };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  AWAITING_PAYMENT: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
  REFUNDED: "bg-zinc-200 text-zinc-700",
};

export default function AccountPage() {
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"orders" | "wishlist" | "profile">("orders");
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  const loadData = useCallback(async () => {
    if (!accessToken()) return;
    const headers = authHeaders();
    const [me, orderList, wish] = await Promise.all([
      fetch(`${API}/auth/me`, { headers }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
      fetch(`${API}/my/orders`, { headers }).then((response) => (response.ok ? response.json() : [])).catch(() => []),
      fetch(`${API}/my/wishlist`, { headers }).then((response) => (response.ok ? response.json() : [])).catch(() => []),
    ]);
    setUser(me?.user ?? me ?? null);
    setOrders(Array.isArray(orderList) ? orderList : orderList?.items ?? []);
    setWishlist(Array.isArray(wish) ? wish : wish?.items ?? []);
  }, []);

  useEffect(() => {
    const stored = accessToken();
    setToken(stored);
    if (stored) void loadData();
  }, [loadData]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const response = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login"
            ? { email: form.email, password: form.password }
            : { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName },
        ),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (data?.code === "ACCOUNT_LOCKED") {
          const minutes = Number(data?.retryAfterMinutes ?? 0);
          throw new Error(minutes > 0 ? `حساب شما به دلیل تلاش‌های ناموفق تا ${minutes} دقیقه دیگر قفل است.` : "حساب شما موقتاً قفل شده است.");
        }
        if (response.status === 429) throw new Error("تعداد تلاش‌های ورود زیاد است؛ حدود یک دقیقه صبر کنید.");
        throw new Error(data?.message ?? "ورود ناموفق بود");
      }
      localStorage.setItem("access_token", data.accessToken ?? data.tokens?.accessToken);
      if (data.refreshToken ?? data.tokens?.refreshToken) {
        localStorage.setItem("refresh_token", data.refreshToken ?? data.tokens?.refreshToken);
      }
      setToken(accessToken());
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در ورود");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setUser(null);
    setOrders([]);
    setWishlist([]);
  }

  async function removeWishlist(productId: string) {
    await fetch(`${API}/my/wishlist/${productId}`, { method: "DELETE", headers: authHeaders() }).catch(() => undefined);
    setWishlist((items) => items.filter((item) => item.product.id !== productId));
  }

  if (!token) {
    return (
      <div className="shell py-16">
        <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow">حساب کاربری</p>
            <h1 className="display-lg mt-3">به آگاهی خوش آمدید</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              با ورود به حساب، سفارش‌ها را پیگیری کنید، سایزها را ذخیره کنید و از تخفیف‌های اعضا باخبر شوید.
            </p>
            <ul className="mt-6 space-y-2 text-[13px] text-[var(--muted)]">
              <li>✦ پیگیری وضعیت سفارش و ارسال</li>
              <li>✦ ذخیره علاقه‌مندی‌ها</li>
              <li>✦ درخواست بازگشت کالا در چند کلیک</li>
            </ul>
          </div>

          <form onSubmit={submit} className="card p-7">
            <div className="flex gap-1 rounded-full bg-[var(--background)] p-1">
              {(["login", "register"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${
                    mode === value ? "bg-[var(--ink)] text-white" : "text-[var(--muted)]"
                  }`}
                >
                  {value === "login" ? "ورود" : "ثبت‌نام"}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              {mode === "register" ? (
                <div className="grid grid-cols-2 gap-3">
                  <input className="field" placeholder="نام" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
                  <input className="field" placeholder="نام خانوادگی" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
                </div>
              ) : null}
              <div>
                <label className="field-label" htmlFor="account-email">ایمیل</label>
                <input id="account-email" className="field" dir="ltr" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div>
                <label className="field-label" htmlFor="account-password">رمز عبور</label>
                <input id="account-password" className="field" dir="ltr" type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              </div>
            </div>

            {error ? <p className="mt-4 rounded-xl bg-[var(--danger)]/8 px-3 py-2 text-[11px] text-[var(--danger)]">{error}</p> : null}

            <button type="submit" className="btn btn-primary mt-6 w-full" disabled={busy}>
              {busy ? "لطفاً صبر کنید…" : mode === "login" ? "ورود به حساب" : "ساخت حساب"}
            </button>
            <p className="mt-3 text-center text-[10px] leading-5 text-[var(--muted)]">
              حساب آزمایشی: sara@example.com / Customer@123
            </p>
          </form>
        </div>
      </div>
    );
  }

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "کاربر آگاهی";

  return (
    <div className="shell py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">حساب من</p>
          <h1 className="display-lg mt-2">سلام {name}</h1>
        </div>
        <button type="button" onClick={logout} className="btn btn-outline text-xs">
          خروج از حساب
        </button>
      </div>

      <div className="mt-7 flex gap-2 border-b border-[var(--line)] pb-3">
        {[
          { id: "orders" as const, label: "سفارش‌ها" },
          { id: "wishlist" as const, label: "علاقه‌مندی‌ها" },
          { id: "profile" as const, label: "اطلاعات حساب" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              tab === item.id ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "orders" ? (
        <div className="mt-7 space-y-3">
          {orders.length ? (
            orders.map((order) => (
              <Link key={order.id} href={`/account/orders/${order.id}`} className="card block p-5 transition hover:border-[var(--ink)]/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold">سفارش {order.number}</p>
                    <p className="mt-1 text-[11px] text-[var(--muted)]">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${STATUS_COLORS[order.status] ?? "bg-zinc-100 text-zinc-700"}`}>{statusFa(order.status)}</span>
                    <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[var(--line)] py-16 text-center">
              <p className="text-sm font-semibold">هنوز سفارشی ثبت نکرده‌اید</p>
              <Link href="/products" className="btn btn-outline mt-5">شروع خرید</Link>
            </div>
          )}
        </div>
      ) : null}

      {tab === "wishlist" ? (
        <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-4">
          {wishlist.length ? (
            wishlist.map((item) => (
              <div key={item.id} className="group">
                <Link href={`/products/${item.product.slug}`} className="block overflow-hidden rounded-2xl bg-[#ece4d6]">
                  {item.product.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.product.images[0].url} alt="" className="aspect-[4/5] w-full object-cover" />
                  ) : null}
                </Link>
                <div className="mt-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[12.5px] font-medium">{item.product.name}</p>
                    <p className="text-[11px] text-[var(--muted)]">{formatPrice(item.product.basePrice)}</p>
                  </div>
                  <button type="button" onClick={() => removeWishlist(item.product.id)} className="text-[11px] text-[var(--muted)] hover:text-[var(--danger)]">
                    حذف
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full py-16 text-center text-sm text-[var(--muted)]">لیست علاقه‌مندی‌ها خالی است.</p>
          )}
        </div>
      ) : null}

      {tab === "profile" ? (
        <div className="card mt-7 max-w-xl p-7">
          <h2 className="text-sm font-bold">اطلاعات حساب</h2>
          <dl className="mt-5 space-y-3 text-[13px]">
            <div className="flex justify-between border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--muted)]">نام</dt>
              <dd>{name}</dd>
            </div>
            <div className="flex justify-between border-b border-[var(--line)] pb-3">
              <dt className="text-[var(--muted)]">ایمیل</dt>
              <dd dir="ltr">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">شماره تماس</dt>
              <dd dir="ltr">{user?.phone ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}
