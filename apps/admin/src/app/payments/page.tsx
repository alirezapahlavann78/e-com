"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { adminApi, faDateTime, faMoney, faNum } from "../../lib/api";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Pagination,
  Select,
  Spinner,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "../../components/ui";

interface PaymentItem {
  id: string;
  provider: "SANDBOX" | "ZARINPAL" | "STRIPE";
  status: "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "REFUNDED";
  amount: number;
  currency: string;
  reference: string | null;
  authority: string | null;
  refId: string | null;
  paidAt: string | null;
  createdAt: string;
  order: { number: string; email: string; total: string | number; status: string };
}

interface PaymentsResponse {
  items: PaymentItem[];
  total: number;
  page: number;
  limit: number;
  summary: { status: string; count: number; amount: number }[];
}

interface GatewayConfig {
  provider: "SANDBOX" | "ZARINPAL";
  zarinpal: { merchantId: string; sandbox: boolean };
  storefrontUrl: string;
  apiPublicUrl: string;
  warnings: string[];
}

const PROVIDER_LABEL: Record<string, string> = { SANDBOX: "آزمایشی", ZARINPAL: "زرین‌پال", STRIPE: "Stripe" };
const STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  AUTHORIZED: "تأیید‌شده",
  PAID: "پرداخت‌شده",
  FAILED: "ناموفق",
  REFUNDED: "بازگشت وجه",
};

export default function PaymentsPage() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [status, setStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      if (provider) params.set("provider", provider);
      if (query.trim()) params.set("q", query.trim());
      const [list, gateway] = await Promise.all([
        adminApi<PaymentsResponse>(`/admin/payments?${params.toString()}`),
        adminApi<GatewayConfig>("/admin/payments/config"),
      ]);
      setData(list);
      setConfig(gateway);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "بارگذاری تراکنش‌ها ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, [page, status, provider, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const summaryOf = (key: string) => data?.summary.find((row) => row.status === key);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">تراکنش‌های پرداخت</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            هر ردیف یک تلاش واقعی پرداخت است: authority درگاه، کد پیگیری، وضعیت و مبلغ.
          </p>
        </div>
        <Button variant="outline" onClick={load}>
          به‌روزرسانی
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--muted)]">درگاه فعال</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={config?.provider === "ZARINPAL" ? "success" : "info"}>
                {config ? PROVIDER_LABEL[config.provider] : "—"}
              </Badge>
              {config?.provider === "ZARINPAL" ? (
                <Badge variant={config.zarinpal.sandbox ? "warn" : "success"}>
                  {config.zarinpal.sandbox ? "هاست سندباکس زرین‌پال" : "محیط عملیاتی زرین‌پال"}
                </Badge>
              ) : null}
              {config?.provider === "ZARINPAL" ? (
                <span className="text-[11px] text-[var(--muted)]" dir="ltr">
                  merchant: {config.zarinpal.merchantId ? `${config.zarinpal.merchantId.slice(0, 8)}…` : "تنظیم نشده"}
                </span>
              ) : null}
            </div>
          </div>
          <Link href="/settings" className="text-xs text-[var(--accent)] underline-offset-4 hover:underline">
            تغییر تنظیمات درگاه
          </Link>
        </div>
        {config?.warnings.length ? (
          <ul className="mt-3 space-y-1 rounded-lg bg-[var(--danger)]/5 px-3 py-2 text-[11px] text-[var(--danger)]">
            {config.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        ) : null}
        <p className="mt-3 text-[11px] leading-5 text-[var(--muted)]">
          آدرس بازگشت درگاه: <span dir="ltr">{config ? `${config.apiPublicUrl}/payments/callback/zarinpal` : "—"}</span>
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["PAID", "PENDING", "FAILED"] as const).map((key) => (
          <Card key={key} className="p-5">
            <p className="text-xs text-[var(--muted)]">{STATUS_LABEL[key]}</p>
            <p className="mt-2 text-xl font-bold">{faMoney(summaryOf(key)?.amount ?? 0)}</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">{faNum(summaryOf(key)?.count ?? 0)} تراکنش</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="تراکنش‌ها"
          subtitle={`${faNum(data?.total ?? 0)} ردیف`}
          action={
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="شماره سفارش، ایمیل یا کد پیگیری"
                className="w-56"
              />
              <Select
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه درگاه‌ها</option>
                <option value="SANDBOX">آزمایشی</option>
                <option value="ZARINPAL">زرین‌پال</option>
              </Select>
              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه وضعیت‌ها</option>
                {Object.entries(STATUS_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : !data?.items.length ? (
          <EmptyState title="تراکنشی ثبت نشده" description="با ثبت سفارش از فروشگاه، تراکنش‌ها اینجا فهرست می‌شوند." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>سفارش</TH>
                <TH>درگاه</TH>
                <TH>مبلغ</TH>
                <TH>وضعیت</TH>
                <TH>کد پیگیری</TH>
                <TH>زمان</TH>
              </TR>
            </THead>
            <TBody>
              {data.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <span className="block font-mono text-xs">{item.order.number}</span>
                    <span className="mt-0.5 block text-[11px] text-[var(--muted)]" dir="ltr">
                      {item.order.email}
                    </span>
                  </TD>
                  <TD>
                    <Badge variant={item.provider === "ZARINPAL" ? "success" : "info"}>
                      {PROVIDER_LABEL[item.provider] ?? item.provider}
                    </Badge>
                  </TD>
                  <TD className="text-sm font-medium">{faMoney(item.amount)}</TD>
                  <TD>
                    <StatusBadge status={item.status} kind="payment" />
                  </TD>
                  <TD className="font-mono text-[11px]" dir="ltr">
                    {item.refId ?? "—"}
                    {item.authority ? (
                      <span className="mt-0.5 block max-w-[180px] truncate text-[10px] text-[var(--muted)]">
                        {item.authority}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="text-[11px] text-[var(--muted)]">{faDateTime(item.paidAt ?? item.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {data && data.total > limit ? (
          <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
        ) : null}
      </Card>
    </div>
  );
}
