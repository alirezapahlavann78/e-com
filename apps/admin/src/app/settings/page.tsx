"use client";

import { useEffect, useMemo, useState } from "react";

import { adminApi, faMoney } from "../../lib/api";
import { Badge, Button, Card, Input, Label, Select, Spinner } from "../../components/ui";

type Setting = { id: string; key: string; value: Record<string, unknown> & { value?: unknown } };

const GROUP_LABELS: Record<string, string> = {
  store: "اطلاعات فروشگاه",
  shipping: "ارسال و تحویل",
  tax: "مالیات",
  theme: "ظاهر",
};

const LABELS: Record<string, string> = {
  "store.name": "نام فروشگاه",
  "store.tagline": "شعار",
  "store.currency": "واحد پول",
  "store.supportEmail": "ایمیل پشتیبانی",
  "store.supportPhone": "تلفن پشتیبانی",
  "store.address": "آدرس",
  "shipping.standardRate": "هزینه ارسال عادی (تومان)",
  "shipping.expressRate": "هزینه ارسال سریع (تومان)",
  "shipping.freeThreshold": "آستانه ارسال رایگان (تومان)",
  "tax.defaultRate": "نرخ مالیات پیش‌فرض",
  "theme.accent": "رنگ تأکید",
};

const SELECTS: Record<string, { value: string; label: string }[]> = {
  "store.currency": [
    { value: "TOMAN", label: "تومان" },
    { value: "RIAL", label: "ریال" },
  ],
};

const NUMERIC = new Set(["shipping.standardRate", "shipping.expressRate", "shipping.freeThreshold", "tax.defaultRate"]);

/** Managed by their own cards (object payloads, not scalar `{value}` rows). */
const OBJECT_KEYS = new Set(["payment.gateway", "notifications.email", "notifications.sms"]);
/** Superseded by `payment.gateway`; hidden so there is exactly one switch. */
const HIDDEN = new Set(["payments.provider"]);

type GatewayDraft = { provider: "SANDBOX" | "ZARINPAL"; merchantId: string; sandbox: boolean };
type ToggleDraft = { email: boolean; sms: boolean };

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [gateway, setGateway] = useState<GatewayDraft>({ provider: "SANDBOX", merchantId: "", sandbox: true });
  const [toggles, setToggles] = useState<ToggleDraft>({ email: true, sms: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    adminApi<Setting[]>("/admin/settings")
      .then((rows) => {
        setSettings(rows);
        setDraft(
          Object.fromEntries(
            rows.filter((row) => !OBJECT_KEYS.has(row.key)).map((row) => [row.key, row.value?.value == null ? "" : String(row.value.value)]),
          ),
        );
        const gatewayRow = rows.find((row) => row.key === "payment.gateway")?.value as
          | { provider?: string; zarinpal?: { merchantId?: string; sandbox?: boolean } }
          | undefined;
        if (gatewayRow) {
          setGateway({
            provider: gatewayRow.provider === "ZARINPAL" ? "ZARINPAL" : "SANDBOX",
            merchantId: gatewayRow.zarinpal?.merchantId ?? "",
            sandbox: gatewayRow.zarinpal?.sandbox ?? true,
          });
        }
        const emailRow = rows.find((row) => row.key === "notifications.email")?.value as { enabled?: boolean } | undefined;
        const smsRow = rows.find((row) => row.key === "notifications.sms")?.value as { enabled?: boolean } | undefined;
        setToggles({ email: emailRow?.enabled !== false, sms: smsRow?.enabled !== false });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const rows = useMemo(() => (settings ?? []).filter((setting) => !OBJECT_KEYS.has(setting.key) && !HIDDEN.has(setting.key)), [settings]);

  const groups = useMemo(() => {
    const map = new Map<string, Setting[]>();
    for (const setting of rows) {
      const prefix = setting.key.split(".")[0] ?? "other";
      map.set(prefix, [...(map.get(prefix) ?? []), setting]);
    }
    return [...map.entries()];
  }, [rows]);

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      for (const setting of rows) {
        const value = draft[setting.key] ?? "";
        const original = setting.value?.value == null ? "" : String(setting.value.value);
        if (value === original) continue;
        const nextValue = NUMERIC.has(setting.key) ? Number(value.replace(/[^\d.-]/g, "")) : value;
        await adminApi("/admin/settings", {
          method: "PUT",
          body: JSON.stringify({ key: setting.key, value: { value: nextValue } }),
        });
      }
      if (gateway.provider === "ZARINPAL" && !gateway.merchantId.trim()) {
        throw new Error("برای زرین‌پال، کد پذیرنده (merchant id) الزامی است.");
      }
      await adminApi("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          key: "payment.gateway",
          value: {
            provider: gateway.provider,
            zarinpal: { merchantId: gateway.merchantId.trim(), sandbox: gateway.sandbox },
          },
        }),
      });
      await adminApi("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "notifications.email", value: { enabled: toggles.email } }),
      });
      await adminApi("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ key: "notifications.sms", value: { enabled: toggles.sms } }),
      });
      setNotice("تنظیمات ذخیره شد. تغییر درگاه از همین لحاظ روی پرداخت‌های بعدی اعمال می‌شود.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex h-72 items-center justify-center">
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : <Spinner className="h-7 w-7" />}
      </div>
    );
  }

  const threshold = Number(draft["shipping.freeThreshold"] ?? 0);
  const standard = Number(draft["shipping.standardRate"] ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">تنظیمات فروشگاه</h1>
          <p className="mt-1 text-[11.5px] text-[var(--muted)]">
            این مقادیر در دیتابیس ذخیره می‌شوند و بلافاصله روی سبد خرید، صفحه پرداخت و ارسال پیام اثر می‌گذارند.
          </p>
        </div>
        <Button onClick={save} disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره تغییرات"}</Button>
      </div>

      {notice ? <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-[12px] text-[var(--success)]">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-[12px] text-[var(--danger)]">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(([prefix, rowsOfGroup]) => (
          <Card key={prefix} className="p-5">
            <h2 className="card-title">{GROUP_LABELS[prefix] ?? prefix}</h2>
            <div className="mt-4 space-y-3">
              {rowsOfGroup.map((row) => {
                const options = SELECTS[row.key];
                return (
                  <div key={row.id}>
                    <Label>{LABELS[row.key] ?? row.key}</Label>
                    {options ? (
                      <Select value={draft[row.key] ?? ""} onChange={(e) => setDraft({ ...draft, [row.key]: e.target.value })}>
                        {options.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        value={draft[row.key] ?? ""}
                        inputMode={NUMERIC.has(row.key) ? "numeric" : undefined}
                        dir={row.key.includes("Email") || row.key.includes("currency") ? "ltr" : undefined}
                        onChange={(e) => setDraft({ ...draft, [row.key]: e.target.value })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <Card className="p-5">
          <h2 className="card-title">درگاه پرداخت</h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            درگاه فعال روی همه پرداخت‌های جدید اثر می‌گذارد. برای زرین‌پال، کد پذیرنده از پنل زرین‌پال گرفته می‌شود.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <Label>درگاه</Label>
              <Select
                value={gateway.provider}
                onChange={(event) => setGateway({ ...gateway, provider: event.target.value as GatewayDraft["provider"] })}
              >
                <option value="SANDBOX">آزمایشی داخلی (بدون بانک)</option>
                <option value="ZARINPAL">زرین‌پال</option>
              </Select>
            </div>
            {gateway.provider === "ZARINPAL" ? (
              <>
                <div>
                  <Label>کد پذیرنده (merchant id)</Label>
                  <Input
                    dir="ltr"
                    value={gateway.merchantId}
                    onChange={(event) => setGateway({ ...gateway, merchantId: event.target.value })}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  />
                </div>
                <label className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={gateway.sandbox}
                    onChange={(event) => setGateway({ ...gateway, sandbox: event.target.checked })}
                  />
                  استفاده از هاست سندباکس زرین‌پال
                </label>
                <p className="rounded-lg bg-[var(--panel-2)] px-3 py-2 text-[10.5px] leading-5 text-[var(--muted)]">
                  آدرس بازگشت باید در پنل زرین‌پال ثبت شده باشد:
                  <span className="mt-1 block break-all font-mono text-[10px]" dir="ltr">
                    /api/payments/callback/zarinpal
                  </span>
                  مبلغ به‌صورت تومان ذخیره می‌شود و برای زرین‌پال ×۱۰ (ریال) ارسال می‌گردد.
                </p>
              </>
            ) : (
              <p className="rounded-lg bg-[var(--panel-2)] px-3 py-2 text-[10.5px] leading-5 text-[var(--muted)]">
                درگاه آزمایشی یک صفحه تأیید داخل فروشگاه نشان می‌دهد و سپس همان مسیر callback واقعی (تأیید →
                به‌روزرسانی سفارش → پیام تراکنشی) را اجرا می‌کند.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="card-title">پیام‌های تراکنشی</h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            خاموش‌کردن یک کانال فقط ثبت پیام‌های جدید را متوقف می‌کند؛ پیام‌های در صف همچنان ارسال می‌شوند.
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-[12px]">
              <span className="flex items-center gap-2">
                ایمیل
                <Badge variant="neutral">سفارش، پرداخت، ارسال، خوش‌آمد</Badge>
              </span>
              <input type="checkbox" checked={toggles.email} onChange={(event) => setToggles({ ...toggles, email: event.target.checked })} />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-[12px]">
              <span className="flex items-center gap-2">
                پیامک
                <Badge variant="neutral">پرداخت، ارسال</Badge>
              </span>
              <input type="checkbox" checked={toggles.sms} onChange={(event) => setToggles({ ...toggles, sms: event.target.checked })} />
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="card-title">شبیه‌سازی هزینه ارسال</h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">بر اساس مقادیر فعلی فرم، بدون ذخیره.</p>
          <div className="mt-4 space-y-2 text-[12px]">
            {[1_000_000, 3_000_000, Math.max(threshold, 5_000_000)].map((subtotal) => {
              const free = subtotal >= threshold;
              const amount = free ? 0 : standard;
              return (
                <div key={subtotal} className="flex items-center justify-between rounded-lg bg-[var(--panel-2)] px-3 py-2">
                  <span className="text-[var(--muted)]">سبد {faMoney(subtotal)}</span>
                  <span className={free ? "font-semibold text-[var(--success)]" : "font-semibold"}>{free ? "ارسال رایگان" : faMoney(amount)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10.5px] leading-5 text-[var(--muted)]">
            سفارش‌های بالای {faMoney(threshold)} ارسال رایگان دارند؛ ارسال سریع با نرخ{" "}
            {faMoney(Number(draft["shipping.expressRate"] ?? 0))} محاسبه می‌شود.
          </p>
        </Card>
      </div>
    </div>
  );
}
