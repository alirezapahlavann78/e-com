"use client";

import { useCallback, useEffect, useState } from "react";

import { adminApi, faDateTime, faNum } from "../../lib/api";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Label,
  Modal,
  Pagination,
  Select,
  Spinner,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "../../components/ui";

type Channel = "EMAIL" | "SMS";
type Status = "PENDING" | "SENT" | "FAILED" | "CANCELLED";

interface NotificationItem {
  id: string;
  channel: Channel;
  template: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: Status;
  provider: string | null;
  providerRef: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  stats: { status: { status: Status; count: number }[]; channel: { channel: Channel; count: number }[] };
  transports: {
    email: { name: string; configured: boolean; from: string };
    sms: { name: string; configured: boolean; sender: string | null };
    worker: { intervalMs: number; maxAttempts: number };
  };
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "در انتظار ارسال",
  SENT: "ارسال‌شده",
  FAILED: "ناموفق",
  CANCELLED: "لغو‌شده",
};

const STATUS_VARIANT: Record<Status, "success" | "warn" | "danger" | "neutral"> = {
  PENDING: "warn",
  SENT: "success",
  FAILED: "danger",
  CANCELLED: "neutral",
};

const TEMPLATE_LABEL: Record<string, string> = {
  "order.placed": "ثبت سفارش",
  "payment.paid": "پرداخت موفق",
  "order.shipped": "ارسال سفارش",
  "auth.welcome": "خوش‌آمدگویی",
  "test.send": "پیام آزمایشی",
};

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [testOpen, setTestOpen] = useState(false);
  const [testChannel, setTestChannel] = useState<Channel>("EMAIL");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      if (channel) params.set("channel", channel);
      if (query.trim()) params.set("q", query.trim());
      setData(await adminApi<NotificationsResponse>(`/admin/notifications?${params.toString()}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "بارگذاری پیام‌ها ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, [page, status, channel, query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: "retry" | "cancel") {
    setBusyId(id);
    setNotice("");
    try {
      await adminApi(`/admin/notifications/${id}/${action}`, { method: "POST" });
      setNotice(action === "retry" ? "ارسال دوباره انجام شد." : "پیام لغو شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "عملیات ناموفق بود");
    } finally {
      setBusyId(null);
    }
  }

  async function dispatchQueue() {
    setNotice("");
    setError("");
    try {
      await adminApi("/admin/notifications/dispatch", { method: "POST" });
      setNotice("صف پردازش شد.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "پردازش صف ناموفق بود");
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestResult("");
    try {
      const result = await adminApi<{ message: NotificationItem }>("/admin/notifications/test", {
        method: "POST",
        body: JSON.stringify({ channel: testChannel, to: testTo.trim() }),
      });
      setTestResult(
        result.message.status === "SENT"
          ? `ارسال شد — ارائه‌دهنده: ${result.message.provider ?? "—"}`
          : `ثبت شد اما ارسال نشد: ${result.message.lastError ?? "خطای نامشخص"}`,
      );
      await load();
    } catch (cause) {
      setTestResult(cause instanceof Error ? cause.message : "ارسال آزمایشی ناموفق بود");
    } finally {
      setTesting(false);
    }
  }

  const statusCount = (key: Status) => data?.stats.status.find((row) => row.status === key)?.count ?? 0;
  const channelCount = (key: Channel) => data?.stats.channel.find((row) => row.channel === key)?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">پیام‌های تراکنشی</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            صف ایمیل و پیامک سفارش‌ها؛ هر پیام وضعیت واقعی ارسال، تعداد تلاش و خطای آخرین تلاش را نگه می‌دارد.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={dispatchQueue}>
            پردازش صف
          </Button>
          <Button onClick={() => { setTestOpen(true); setTestResult(""); }}>ارسال آزمایشی</Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/5 px-4 py-3 text-sm text-[var(--success)]">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(["PENDING", "SENT", "FAILED", "CANCELLED"] as Status[]).map((key) => (
          <Card key={key} className="p-5">
            <p className="text-xs text-[var(--muted)]">{STATUS_LABEL[key]}</p>
            <p className="mt-2 text-2xl font-bold">{faNum(statusCount(key))}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs text-[var(--muted)]">ارائه‌دهنده ایمیل</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={data?.transports.email.configured ? "success" : "warn"}>
              {data?.transports.email.name === "smtp" ? "SMTP" : "فایل محلی"}
            </Badge>
            <span className="text-xs text-[var(--muted)]" dir="ltr">
              {data?.transports.email.from}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
            {data?.transports.email.configured
              ? "ایمیل‌ها واقعاً از طریق SMTP ارسال می‌شوند."
              : "MAIL_HOST تنظیم نشده؛ پیام‌ها به‌صورت فایل .eml در uploads/mail ذخیره می‌شوند."}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-[var(--muted)]">ارائه‌دهنده پیامک</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={data?.transports.sms.configured ? "success" : "warn"}>
              {data?.transports.sms.name === "kavenegar" ? "کاوه‌نگار" : "لاگ سرور"}
            </Badge>
            <span className="text-xs text-[var(--muted)]">
              {channelCount("SMS")} پیامک در صف/ارسال‌شده
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
            {data?.transports.sms.configured
              ? "پیامک‌ها از طریق KAVENEGAR_API_KEY ارسال می‌شوند."
              : "KAVENEGAR_API_KEY تنظیم نشده؛ متن پیامک در لاگ با پیشوند [sms:log] ثبت می‌شود."}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="صف پیام‌ها"
          subtitle={`${faNum(data?.total ?? 0)} پیام`}
          action={
            <div className="flex flex-wrap gap-2">
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="جستجوی گیرنده یا موضوع"
                className="w-52"
              />
              <Select
                value={channel}
                onChange={(event) => {
                  setChannel(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">همه کانال‌ها</option>
                <option value="EMAIL">ایمیل</option>
                <option value="SMS">پیامک</option>
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
          <EmptyState title="پیامی وجود ندارد" description="با ثبت سفارش یا ارسال آزمایشی، پیام‌ها اینجا نمایش داده می‌شوند." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>گیرنده</TH>
                <TH>قالب</TH>
                <TH>کانال</TH>
                <TH>وضعیت</TH>
                <TH>تلاش</TH>
                <TH>زمان</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {data.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <span className="block text-sm" dir={item.channel === "EMAIL" ? "ltr" : "rtl"}>
                      {item.recipient}
                    </span>
                    <span className="mt-0.5 block max-w-[260px] truncate text-[11px] text-[var(--muted)]">
                      {item.subject ?? item.body}
                    </span>
                  </TD>
                  <TD className="text-xs">{TEMPLATE_LABEL[item.template] ?? item.template}</TD>
                  <TD>
                    <Badge variant="neutral">{item.channel === "EMAIL" ? "ایمیل" : "پیامک"}</Badge>
                  </TD>
                  <TD>
                    <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                    {item.lastError ? (
                      <span className="mt-1 block max-w-[220px] truncate text-[10px] text-[var(--danger)]" title={item.lastError}>
                        {item.lastError}
                      </span>
                    ) : null}
                  </TD>
                  <TD className="text-xs">
                    {faNum(item.attempts)} / {faNum(item.maxAttempts)}
                  </TD>
                  <TD className="text-[11px] text-[var(--muted)]">
                    {faDateTime(item.sentAt ?? item.createdAt)}
                    {item.status === "PENDING" ? (
                      <span className="mt-0.5 block">تلاش بعدی: {faDateTime(item.nextAttemptAt)}</span>
                    ) : null}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      {item.status !== "SENT" ? (
                        <Button
                          variant="outline"
                          disabled={busyId === item.id}
                          onClick={() => act(item.id, "retry")}
                        >
                          ارسال دوباره
                        </Button>
                      ) : null}
                      {item.status === "PENDING" || item.status === "FAILED" ? (
                        <Button variant="ghost" disabled={busyId === item.id} onClick={() => act(item.id, "cancel")}>
                          لغو
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {data && data.total > limit ? (
          <Pagination page={data.page} limit={data.limit} total={data.total} onPage={setPage} />
        ) : null}
      </Card>

      <Modal open={testOpen} onClose={() => setTestOpen(false)} title="ارسال پیام آزمایشی">
        <div className="space-y-4">
          <div>
            <Label htmlFor="test-channel">کانال</Label>
            <Select
              id="test-channel"
              value={testChannel}
              onChange={(event) => setTestChannel(event.target.value as Channel)}
            >
              <option value="EMAIL">ایمیل</option>
              <option value="SMS">پیامک</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="test-to">{testChannel === "EMAIL" ? "ایمیل گیرنده" : "شماره موبایل"}</Label>
            <Input
              id="test-to"
              dir="ltr"
              value={testTo}
              onChange={(event) => setTestTo(event.target.value)}
              placeholder={testChannel === "EMAIL" ? "you@example.com" : "09121234567"}
            />
          </div>
          {testResult ? <p className="text-xs leading-6 text-[var(--muted)]">{testResult}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTestOpen(false)}>
              بستن
            </Button>
            <Button onClick={sendTest} disabled={testing || !testTo.trim()}>
              {testing ? "در حال ارسال…" : "ارسال"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
