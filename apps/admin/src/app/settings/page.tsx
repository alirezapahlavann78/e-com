"use client";

import { useEffect, useMemo, useState } from "react";

import { adminApi, faMoney } from "../../lib/api";
import { Button, Card, Input, Label, Select, Spinner } from "../../components/ui";

type Setting = { id: string; key: string; value: { value?: unknown } & Record<string, unknown> };

const GROUP_LABELS: Record<string, string> = {
  store: "اطلاعات فروشگاه",
  shipping: "ارسال و تحویل",
  payments: "پرداخت",
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
  "payments.provider": "درگاه پرداخت",
};

const SELECTS: Record<string, { value: string; label: string }[]> = {
  "payments.provider": [
    { value: "SANDBOX", label: "سندباکس (تست)" },
    { value: "ZARINPAL", label: "زرین‌پال" },
    { value: "IDPAY", label: "آیدی‌پی" },
  ],
  "store.currency": [
    { value: "TOMAN", label: "تومان" },
    { value: "RIAL", label: "ریال" },
  ],
};

const NUMERIC = new Set(["shipping.standardRate", "shipping.expressRate", "shipping.freeThreshold"]);

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[] | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    adminApi<Setting[]>("/admin/settings")
      .then((rows) => {
        setSettings(rows);
        setDraft(
          Object.fromEntries(
            rows.map((row) => [row.key, row.value?.value == null ? "" : String(row.value.value)]),
          ),
        );
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Setting[]>();
    for (const setting of settings ?? []) {
      const prefix = setting.key.split(".")[0] ?? "other";
      map.set(prefix, [...(map.get(prefix) ?? []), setting]);
    }
    return [...map.entries()];
  }, [settings]);

  const save = async () => {
    if (!settings) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      for (const setting of settings) {
        const value = draft[setting.key] ?? "";
        const original = setting.value?.value == null ? "" : String(setting.value.value);
        if (value === original) continue;
        const nextValue = NUMERIC.has(setting.key) ? Number(value.replace(/[^\d.-]/g, "")) : value;
        await adminApi("/admin/settings", {
          method: "PUT",
          body: JSON.stringify({ key: setting.key, value: { value: nextValue } }),
        });
      }
      setNotice("تنظیمات ذخیره شد و در فروشگاه اعمال می‌شود.");
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
          <p className="mt-1 text-[11.5px] text-[var(--muted)]">این مقادیر در دیتابیس ذخیره می‌شوند و بلافاصله در محاسبه سبد خرید و صفحه پرداخت اثر می‌گذارند.</p>
        </div>
        <Button onClick={save} disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره تغییرات"}</Button>
      </div>

      {notice ? <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-[12px] text-[var(--success)]">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-[12px] text-[var(--danger)]">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map(([prefix, rows]) => (
          <Card key={prefix} className="p-5">
            <h2 className="card-title">{GROUP_LABELS[prefix] ?? prefix}</h2>
            <div className="mt-4 space-y-3">
              {rows.map((row) => {
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
                      dir={row.key.includes("Email") || row.key.includes("currency") || row.key.includes("provider") ? "ltr" : undefined}
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
            سفارش‌های بالای {faMoney(threshold)} ارسال رایگان دارند؛ ارسال سریع با نرخ {faMoney(Number(draft["shipping.expressRate"] ?? 0))} محاسبه می‌شود.
          </p>
        </Card>
      </div>
    </div>
  );
}
