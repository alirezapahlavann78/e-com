"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { accessToken, addToCart, authHeaders } from "../../components/cart-store";
import { formatDate, formatPrice, statusFa } from "../../lib/format";

const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type User = { id: string; email: string; firstName?: string | null; lastName?: string | null; phone?: string | null };
type OrderItem = { id: string; name: string; quantity: number; imageUrl?: string | null; unitPrice?: string; totalPrice?: string };
type History = { id: string; toStatus: string; toPayment?: string | null; note?: string | null; createdAt: string };
type Shipment = { id: string; carrier?: string | null; trackingNumber?: string | null; status: string; shippedAt?: string | null; deliveredAt?: string | null };
type Order = {
  id: string;
  number: string;
  status: string;
  paymentStatus: string;
  total: string;
  subtotal?: string;
  shippingAmount?: string;
  discountAmount?: string;
  createdAt: string;
  customerNote?: string | null;
  items?: OrderItem[];
  shipments?: Shipment[];
  statusHistory?: History[];
};
type WishlistItem = { id: string; product: { id: string; name: string; slug: string; basePrice: string | null; images?: { url: string }[] } };
type Address = {
  id: string;
  title?: string | null;
  fullName: string;
  phone?: string | null;
  country: string;
  province: string;
  city: string;
  postalCode?: string | null;
  address1: string;
  address2?: string | null;
  isDefault: boolean;
};
type Summary = {
  user: { id: string; email: string; firstName?: string | null; lastName?: string | null; phone?: string | null; memberSince: string };
  preferences: { marketingOptIn: boolean; smsOptIn: boolean };
  stats: { orders: number; paidOrders: number; totalSpent: number; inTransit: number; delivered: number; wishlist: number; addresses: number; lastOrderAt: string | null };
  loyalty: { points: number; tier: string; tierLabel: string; discount: number; nextTier: { key: string; label: string; discount: number; remaining: number } | null; progress: number };
  recentOrders: Order[];
};

type Tab = "overview" | "orders" | "addresses" | "wishlist" | "profile";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview", label: "نمای کلی", icon: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10" },
  { id: "orders", label: "سفارش‌ها", icon: "M6 2h12l2 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8l2-6zM6 8h12M9 13h6" },
  { id: "addresses", label: "آدرس‌ها", icon: "M12 22s8-6 8-12a8 8 0 1 0-16 0c0 6 8 12 8 12zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
  { id: "wishlist", label: "علاقه‌مندی‌ها", icon: "M12 20s-7-4.3-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.7-7 9-7 9z" },
  { id: "profile", label: "حساب من", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  AWAITING_PAYMENT: "bg-amber-50 text-amber-800 ring-amber-200",
  PAID: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  PROCESSING: "bg-sky-50 text-sky-800 ring-sky-200",
  SHIPPED: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  DELIVERED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 ring-red-200",
  REFUNDED: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  RETURN_REQUESTED: "bg-amber-50 text-amber-800 ring-amber-200",
};

const TIMELINE: { key: string; label: string }[] = [
  { key: "PLACED", label: "ثبت سفارش" },
  { key: "PAID", label: "پرداخت" },
  { key: "SHIPPED", label: "ارسال" },
  { key: "DELIVERED", label: "تحویل" },
];

/** How far an order has progressed, used by the inline timeline. */
function progressOf(order: Order) {
  const status = order.status;
  if (["DELIVERED", "COMPLETED"].includes(status)) return 4;
  if (["SHIPPED"].includes(status)) return 3;
  if (["PROCESSING", "PAID"].includes(status)) return 2;
  if (order.paymentStatus === "PAID") return 2;
  return 1;
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold ring-1 ring-inset ${STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200"}`}>
      {statusFa(status)}
    </span>
  );
}

function Timeline({ order }: { order: Order }) {
  const reached = progressOf(order);
  return (
    <div className="mt-4 flex items-start gap-0">
      {TIMELINE.map((step, index) => {
        const done = index < reached;
        return (
          <div key={step.key} className="flex flex-1 items-start">
            <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 56 }}>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                  done ? "bg-[var(--ink)] text-white" : "border border-[var(--line)] bg-white text-[var(--muted)]"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className={`text-[10px] ${done ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>{step.label}</span>
            </div>
            {index < TIMELINE.length - 1 ? (
              <span className={`mt-3 h-px flex-1 ${index + 1 < reached ? "bg-[var(--ink)]/60" : "bg-[var(--line)]"}`} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function AccountPage() {
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [tab, setTab] = useState<Tab>("overview");
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [openOrder, setOpenOrder] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState<Partial<Address> | null>(null);
  const [addressBusy, setAddressBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", phone: "", marketingOptIn: false, smsOptIn: false });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");

  const loadData = useCallback(async () => {
    if (!accessToken()) return;
    const headers = authHeaders();
    const [me, stats, orderList, wish, addressList] = await Promise.all([
      fetch(`${API}/auth/me`, { headers }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
      fetch(`${API}/my/summary`, { headers }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
      fetch(`${API}/my/orders`, { headers }).then((response) => (response.ok ? response.json() : [])).catch(() => []),
      fetch(`${API}/my/wishlist`, { headers }).then((response) => (response.ok ? response.json() : [])).catch(() => []),
      fetch(`${API}/my/addresses`, { headers }).then((response) => (response.ok ? response.json() : [])).catch(() => []),
    ]);
    setUser(me?.user ?? me ?? null);
    setOrders(Array.isArray(orderList) ? orderList : orderList?.items ?? []);
    setWishlist(Array.isArray(wish) ? wish : wish?.items ?? []);
    setAddresses(Array.isArray(addressList) ? addressList : []);
    if (stats) {
      setSummary(stats);
      setProfileForm({
        firstName: stats.user?.firstName ?? "",
        lastName: stats.user?.lastName ?? "",
        phone: stats.user?.phone ?? "",
        marketingOptIn: Boolean(stats.preferences?.marketingOptIn),
        smsOptIn: Boolean(stats.preferences?.smsOptIn),
      });
    }
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
    setSummary(null);
    setOrders([]);
    setWishlist([]);
    setAddresses([]);
    setTab("overview");
  }

  async function removeWishlist(productId: string) {
    await fetch(`${API}/my/wishlist/${productId}`, { method: "DELETE", headers: authHeaders() }).catch(() => undefined);
    setWishlist((items) => items.filter((item) => item.product.id !== productId));
    setNotice("از علاقه‌مندی‌ها حذف شد.");
  }

  async function addWishItem(productId: string) {
    try {
      await addToCart(productId);
      setNotice("به سبد خرید اضافه شد.");
    } catch {
      setNotice("افزودن به سبد ناموفق بود.");
    }
  }

  async function saveAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!addressForm) return;
    setAddressBusy(true);
    setNotice("");
    try {
      const payload = {
        title: addressForm.title || undefined,
        fullName: addressForm.fullName,
        phone: addressForm.phone || undefined,
        country: addressForm.country || "ایران",
        province: addressForm.province,
        city: addressForm.city,
        postalCode: addressForm.postalCode || undefined,
        address1: addressForm.address1,
        address2: addressForm.address2 || undefined,
        isDefault: Boolean(addressForm.isDefault),
      };
      const response = await fetch(
        addressForm.id ? `${API}/my/addresses/${addressForm.id}` : `${API}/my/addresses`,
        {
          method: addressForm.id ? "PATCH" : "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ذخیره آدرس ناموفق بود");
      }
      setAddressForm(null);
      setNotice("آدرس ذخیره شد.");
      await loadData();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "خطا در ذخیره آدرس");
    } finally {
      setAddressBusy(false);
    }
  }

  async function deleteAddress(id: string) {
    if (!window.confirm("این آدرس حذف شود؟")) return;
    const response = await fetch(`${API}/my/addresses/${id}`, { method: "DELETE", headers: authHeaders() });
    if (response.ok) {
      setNotice("آدرس حذف شد.");
      await loadData();
    }
  }

  async function makeDefault(id: string) {
    await fetch(`${API}/my/addresses/${id}/default`, { method: "POST", headers: authHeaders() });
    await loadData();
    setNotice("آدرس پیش‌فرض تغییر کرد.");
  }

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const response = await fetch(`${API}/my/profile`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (!response.ok) throw new Error("ذخیره اطلاعات ناموفق بود");
      setProfileNotice("اطلاعات حساب به‌روزرسانی شد.");
      await loadData();
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "خطا در ذخیره");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const response = await fetch(`${API}/my/password`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? "تغییر رمز ناموفق بود");
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setProfileNotice("رمز عبور تغییر کرد؛ سایر دستگاه‌ها از حساب خارج شدند.");
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "خطا در تغییر رمز");
    } finally {
      setProfileBusy(false);
    }
  }

  const fullName = useMemo(
    () => [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "کاربر آگاهی",
    [user],
  );

  const initial = (user?.firstName ?? user?.email ?? "آ").trim().charAt(0);

  if (!token) {
    return (
      <div className="shell py-16">
        <div className="mx-auto grid max-w-4xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow">حساب کاربری</p>
            <h1 className="display-lg mt-3">به آگاهی خوش آمدید</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              با ورود به حساب، سفارش‌ها را پیگیری کنید، آدرس‌ها و سایزها را ذخیره کنید و از تخفیف‌های اعضا باخبر شوید.
            </p>
            <ul className="mt-6 space-y-2 text-[13px] text-[var(--muted)]">
              <li>✦ پیگیری مرحله‌به‌مرحله سفارش و کد رهگیری</li>
              <li>✦ دفترچه آدرس‌ها برای تسویه‌حساب سریع‌تر</li>
              <li>✦ امتیاز و تخفیف باشگاه مشتریان</li>
            </ul>
          </div>

          <form onSubmit={submit} className="card p-7">
            <div className="flex gap-1 rounded-full bg-[var(--background)] p-1">
              {(["login", "register"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={`flex-1 rounded-full py-2 text-xs font-semibold transition ${mode === value ? "bg-[var(--ink)] text-white" : "text-[var(--muted)]"}`}
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
            <p className="mt-3 text-center text-[10px] leading-5 text-[var(--muted)]">حساب آزمایشی: sara@example.com / Customer@123</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-[var(--ink)] px-6 py-8 text-white sm:px-10">
        <div className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-[#d9b98f]/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-xl font-bold text-[var(--ink)]">
              {initial}
            </span>
            <div>
              <p className="text-[10px] tracking-[0.35em] text-[#d9b98f]">حساب من</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight">{fullName}</h1>
              <p className="mt-1 text-[11.5px] text-white/60" dir="ltr">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {summary ? (
              <div className="flex gap-2 text-center">
                {[
                  { label: "سفارش", value: summary.stats.orders },
                  { label: "امتیاز", value: summary.loyalty.points },
                  { label: "سطح", value: summary.loyalty.tierLabel },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/8 px-3 py-2 ring-1 ring-inset ring-white/10">
                    <p className="text-[13px] font-bold">{typeof item.value === "number" ? new Intl.NumberFormat("fa-IR").format(item.value) : item.value}</p>
                    <p className="mt-0.5 text-[9.5px] text-white/60">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={logout} className="rounded-full border border-white/25 px-4 py-2 text-[11px] font-semibold text-white/85 transition hover:bg-white/10">
              خروج از حساب
            </button>
          </div>
        </div>
      </section>

      {notice ? (
        <p className="mt-4 rounded-xl bg-[var(--accent-soft)]/35 px-4 py-2 text-[11.5px] text-[var(--ink)]">{notice}</p>
      ) : null}

      <div className="mt-7 grid gap-6 lg:grid-cols-[250px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="card p-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-[12.5px] transition ${
                  tab === item.id ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span className="flex-1">{item.label}</span>
                {item.id === "wishlist" && summary?.stats.wishlist ? <span className="text-[10px] opacity-70">{summary.stats.wishlist}</span> : null}
                {item.id === "addresses" && summary?.stats.addresses ? <span className="text-[10px] opacity-70">{summary.stats.addresses}</span> : null}
              </button>
            ))}
          </nav>

          {summary ? (
            <div className="card mt-4 p-4">
              <p className="text-[10.5px] tracking-[0.2em] text-[var(--muted)]">باشگاه مشتریان</p>
              <p className="mt-2 text-sm font-bold">{summary.loyalty.tierLabel}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${summary.loyalty.progress}%` }} />
              </div>
              <p className="mt-2 text-[10.5px] leading-5 text-[var(--muted)]">
                {summary.loyalty.nextTier
                  ? `${formatPrice(String(summary.loyalty.nextTier.remaining))} تا ${summary.loyalty.nextTier.label}`
                  : "بالاترین سطح باشگاه — ممنون که هستید."}
              </p>
              <Link href="/products" className="btn btn-outline mt-3 w-full py-1.5 text-[11px]">ادامه خرید</Link>
            </div>
          ) : null}
        </aside>

        {/* Content */}
        <section className="min-w-0 space-y-5">
          {tab === "overview" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "سفارش‌ها", value: summary?.stats.orders ?? orders.length, hint: `${summary?.stats.paidOrders ?? 0} پرداخت‌شده` },
                  { label: "در راه", value: summary?.stats.inTransit ?? 0, hint: "آماده‌سازی یا ارسال" },
                  { label: "مجموع خرید", value: formatPrice(String(summary?.stats.totalSpent ?? 0)), hint: "سفارش‌های پرداخت‌شده" },
                  { label: "امتیاز باشگاه", value: new Intl.NumberFormat("fa-IR").format(summary?.loyalty.points ?? 0), hint: summary?.loyalty.tierLabel ?? "—" },
                ].map((card) => (
                  <div key={card.label} className="card p-4">
                    <p className="text-[10.5px] text-[var(--muted)]">{card.label}</p>
                    <p className="mt-2 text-lg font-bold">{card.value}</p>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">{card.hint}</p>
                  </div>
                ))}
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">آخرین سفارش‌ها</h2>
                  <button type="button" onClick={() => setTab("orders")} className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]">
                    همه سفارش‌ها
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {(summary?.recentOrders?.length ? summary.recentOrders : orders.slice(0, 3)).map((order) => (
                    <Link key={order.id} href={`/account/orders/${order.id}`} className="block rounded-2xl border border-[var(--line)] p-3 transition hover:border-[var(--ink)]/30">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold">سفارش {order.number}</span>
                          <StatusPill status={order.status} />
                        </div>
                        <span className="text-[12px] font-semibold">{formatPrice(order.total)}</span>
                      </div>
                      <p className="mt-1 text-[10.5px] text-[var(--muted)]">{formatDate(order.createdAt)}</p>
                      <Timeline order={order} />
                    </Link>
                  ))}
                  {orders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[var(--line)] py-10 text-center">
                      <p className="text-sm font-semibold">هنوز سفارشی ثبت نکرده‌اید</p>
                      <Link href="/products" className="btn btn-primary mt-4">شروع خرید</Link>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { title: "آدرس‌ها", value: summary?.stats.addresses ?? addresses.length, action: () => setTab("addresses"), label: "مدیریت آدرس‌ها" },
                  { title: "علاقه‌مندی‌ها", value: summary?.stats.wishlist ?? wishlist.length, action: () => setTab("wishlist"), label: "مشاهده لیست" },
                  { title: "تحویل‌شده", value: summary?.stats.delivered ?? 0, action: () => setTab("orders"), label: "تاریخچه سفارش" },
                ].map((box) => (
                  <div key={box.title} className="card flex items-center justify-between p-4">
                    <div>
                      <p className="text-[10.5px] text-[var(--muted)]">{box.title}</p>
                      <p className="mt-1 text-lg font-bold">{new Intl.NumberFormat("fa-IR").format(box.value)}</p>
                    </div>
                    <button type="button" onClick={box.action} className="text-[10.5px] text-[var(--accent)] hover:underline">
                      {box.label}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {tab === "orders" ? (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[var(--line)] py-16 text-center">
                  <p className="text-sm font-semibold">هنوز سفارشی ثبت نکرده‌اید</p>
                  <Link href="/products" className="btn btn-outline mt-5">شروع خرید</Link>
                </div>
              ) : null}
              {orders.map((order) => {
                const expanded = openOrder === order.id;
                return (
                  <div key={order.id} className="card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenOrder(expanded ? null : order.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-right"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-bold">سفارش {order.number}</span>
                          <StatusPill status={order.status} />
                        </div>
                        <p className="mt-1 text-[10.5px] text-[var(--muted)]">
                          {formatDate(order.createdAt)} · {order.items?.length ?? 0} قلم · {formatPrice(order.total)}
                        </p>
                      </div>
                      <span className="text-[11px] text-[var(--muted)]">{expanded ? "بستن" : "جزئیات"}</span>
                    </button>

                    <div className="px-4 pb-4">
                      <Timeline order={order} />
                    </div>

                    {expanded ? (
                      <div className="border-t border-[var(--line)] p-4">
                        <div className="space-y-3">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex items-center gap-3">
                              <span className="h-12 w-10 overflow-hidden rounded-lg bg-[var(--background)]">
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                                ) : null}
                              </span>
                              <div className="flex-1">
                                <p className="text-[12px]">{item.name}</p>
                                <p className="text-[10px] text-[var(--muted)]">تعداد: {new Intl.NumberFormat("fa-IR").format(item.quantity)}</p>
                              </div>
                              {item.totalPrice ? <span className="text-[11.5px] font-medium">{formatPrice(item.totalPrice)}</span> : null}
                            </div>
                          ))}
                        </div>

                        {order.shipments?.length ? (
                          <div className="mt-4 rounded-xl bg-[var(--background)] p-3 text-[11px]">
                            {order.shipments.map((shipment) => (
                              <p key={shipment.id}>
                                {shipment.carrier ?? "ارسال"} · وضعیت: {statusFa(shipment.status)}
                                {shipment.trackingNumber ? (
                                  <>
                                    {" · کد رهگیری: "}
                                    <span dir="ltr" className="font-medium">{shipment.trackingNumber}</span>
                                  </>
                                ) : null}
                              </p>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-3 text-[11px]">
                          <Link href={`/account/orders/${order.id}`} className="btn btn-outline py-1.5 text-[11px]">صفحه سفارش</Link>
                          {["DELIVERED", "COMPLETED"].includes(order.status) ? (
                            <Link href={`/account/orders/${order.id}#return`} className="text-[var(--accent)] hover:underline">ثبت درخواست مرجوعی</Link>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {tab === "addresses" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold">دفترچه آدرس‌ها</h2>
                <button type="button" className="btn btn-primary py-2 text-[11.5px]" onClick={() => setAddressForm({ country: "ایران", fullName: fullName })}>
                  افزودن آدرس
                </button>
              </div>

              {addressForm ? (
                <form onSubmit={saveAddress} className="card space-y-3 p-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="field-label" htmlFor="addr-title">عنوان</label>
                      <input id="addr-title" className="field" placeholder="خانه، محل کار…" value={addressForm.title ?? ""} onChange={(event) => setAddressForm({ ...addressForm, title: event.target.value })} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="addr-name">نام گیرنده</label>
                      <input id="addr-name" className="field" required value={addressForm.fullName ?? ""} onChange={(event) => setAddressForm({ ...addressForm, fullName: event.target.value })} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="addr-phone">تلفن</label>
                      <input id="addr-phone" className="field" dir="ltr" value={addressForm.phone ?? ""} onChange={(event) => setAddressForm({ ...addressForm, phone: event.target.value })} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="addr-postal">کد پستی</label>
                      <input id="addr-postal" className="field" dir="ltr" value={addressForm.postalCode ?? ""} onChange={(event) => setAddressForm({ ...addressForm, postalCode: event.target.value })} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="addr-province">استان</label>
                      <input id="addr-province" className="field" required value={addressForm.province ?? ""} onChange={(event) => setAddressForm({ ...addressForm, province: event.target.value })} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="addr-city">شهر</label>
                      <input id="addr-city" className="field" required value={addressForm.city ?? ""} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="addr-line1">نشانی</label>
                    <textarea id="addr-line1" className="field min-h-[70px]" required value={addressForm.address1 ?? ""} onChange={(event) => setAddressForm({ ...addressForm, address1: event.target.value })} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="addr-line2">نشانی تکمیلی (پلاک، واحد)</label>
                    <input id="addr-line2" className="field" value={addressForm.address2 ?? ""} onChange={(event) => setAddressForm({ ...addressForm, address2: event.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-[11.5px]">
                    <input type="checkbox" checked={Boolean(addressForm.isDefault)} onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} />
                    این آدرس پیش‌فرض باشد
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary py-2 text-[11.5px]" disabled={addressBusy}>
                      {addressBusy ? "در حال ذخیره…" : "ذخیره آدرس"}
                    </button>
                    <button type="button" onClick={() => setAddressForm(null)} className="btn btn-outline py-2 text-[11.5px]">انصراف</button>
                  </div>
                </form>
              ) : null}

              {addresses.length === 0 && !addressForm ? (
                <div className="rounded-3xl border border-dashed border-[var(--line)] py-14 text-center">
                  <p className="text-sm font-semibold">هنوز آدرسی ذخیره نکرده‌اید</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">با ذخیره آدرس، تسویه‌حساب بعدی چند ثانیه‌ای می‌شود.</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => (
                  <div key={address.id} className={`card p-4 ${address.isDefault ? "ring-1 ring-[var(--accent)]/40" : ""}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-bold">{address.title ?? "آدرس"}</p>
                      {address.isDefault ? <span className="rounded-full bg-[var(--accent-soft)]/40 px-2 py-0.5 text-[9.5px] text-[var(--ink)]">پیش‌فرض</span> : null}
                    </div>
                    <p className="mt-2 text-[11.5px]">{address.fullName}</p>
                    <p className="mt-1 text-[10.5px] leading-5 text-[var(--muted)]">
                      {address.province}، {address.city}
                      <br />
                      {address.address1}
                      {address.address2 ? `، ${address.address2}` : ""}
                      {address.postalCode ? <span className="block" dir="ltr">کد پستی: {address.postalCode}</span> : null}
                      {address.phone ? <span className="block" dir="ltr">{address.phone}</span> : null}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-[10.5px]">
                      <button type="button" onClick={() => setAddressForm(address)} className="text-[var(--accent)] hover:underline">ویرایش</button>
                      {!address.isDefault ? (
                        <button type="button" onClick={() => void makeDefault(address.id)} className="text-[var(--muted)] hover:text-[var(--foreground)]">پیش‌فرض کن</button>
                      ) : null}
                      <button type="button" onClick={() => void deleteAddress(address.id)} className="text-[var(--danger)] hover:underline">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "wishlist" ? (
            <div>
              {wishlist.length ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {wishlist.map((item) => (
                    <div key={item.id} className="group">
                      <Link href={`/products/${item.product.slug}`} className="block overflow-hidden rounded-2xl bg-[var(--image-bg)]">
                        {item.product.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.product.images[0].url} alt="" className="aspect-[4/5] w-full object-cover transition group-hover:scale-[1.03]" />
                        ) : null}
                      </Link>
                      <p className="mt-2 text-[12.5px] font-medium">{item.product.name}</p>
                      <p className="text-[11px] text-[var(--muted)]">{formatPrice(item.product.basePrice)}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10.5px]">
                        <button type="button" onClick={() => void addWishItem(item.product.id)} className="text-[var(--accent)] hover:underline">افزودن به سبد</button>
                        <button type="button" onClick={() => void removeWishlist(item.product.id)} className="text-[var(--muted)] hover:text-[var(--danger)]">حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-[var(--line)] py-16 text-center">
                  <p className="text-sm font-semibold">لیست علاقه‌مندی‌ها خالی است</p>
                  <Link href="/products" className="btn btn-outline mt-5">دیدن محصولات</Link>
                </div>
              )}
            </div>
          ) : null}

          {tab === "profile" ? (
            <div className="space-y-4">
              {profileNotice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">{profileNotice}</p> : null}
              {profileError ? <p className="rounded-xl bg-[var(--danger)]/8 px-3 py-2 text-[11px] text-[var(--danger)]">{profileError}</p> : null}

              <form onSubmit={saveProfile} className="card space-y-4 p-5">
                <h2 className="text-sm font-bold">اطلاعات شخصی</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="p-first">نام</label>
                    <input id="p-first" className="field" value={profileForm.firstName} onChange={(event) => setProfileForm({ ...profileForm, firstName: event.target.value })} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="p-last">نام خانوادگی</label>
                    <input id="p-last" className="field" value={profileForm.lastName} onChange={(event) => setProfileForm({ ...profileForm, lastName: event.target.value })} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="p-phone">شماره تماس</label>
                    <input id="p-phone" className="field" dir="ltr" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">ایمیل</label>
                    <input className="field opacity-60" dir="ltr" value={user?.email ?? ""} readOnly />
                  </div>
                </div>

                <div className="space-y-2 rounded-xl bg-[var(--background)] p-3">
                  <label className="flex items-center justify-between gap-3 text-[11.5px]">
                    <span>دریافت خبرنامه و پیشنهادهای ویژه (ایمیل)</span>
                    <input type="checkbox" checked={profileForm.marketingOptIn} onChange={(event) => setProfileForm({ ...profileForm, marketingOptIn: event.target.checked })} />
                  </label>
                  <label className="flex items-center justify-between gap-3 text-[11.5px]">
                    <span>پیامک تخفیف‌ها و موجودی</span>
                    <input type="checkbox" checked={profileForm.smsOptIn} onChange={(event) => setProfileForm({ ...profileForm, smsOptIn: event.target.checked })} />
                  </label>
                </div>

                <button type="submit" className="btn btn-primary py-2 text-[11.5px]" disabled={profileBusy}>
                  {profileBusy ? "در حال ذخیره…" : "ذخیره تغییرات"}
                </button>
              </form>

              <form onSubmit={changePassword} className="card space-y-3 p-5">
                <h2 className="text-sm font-bold">تغییر رمز عبور</h2>
                <p className="text-[10.5px] text-[var(--muted)]">پس از تغییر رمز، سایر دستگاه‌ها از حساب خارج می‌شوند.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="p-current">رمز فعلی</label>
                    <input id="p-current" className="field" dir="ltr" type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="p-new">رمز جدید</label>
                    <input id="p-new" className="field" dir="ltr" type="password" required minLength={8} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn btn-outline py-2 text-[11.5px]" disabled={profileBusy}>تغییر رمز</button>
              </form>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
