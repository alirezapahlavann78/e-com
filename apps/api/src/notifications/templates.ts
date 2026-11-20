/**
 * Transactional message templates.
 *
 * Everything is rendered here (not in the database) so copy lives in git and a
 * new locale/template is a code change plus a seeded row — never a JSON blob an
 * admin has to keep in sync. Each template returns both a Persian text body
 * (for SMS and plain-text mail) and a small HTML body for email.
 */
export type NotificationTemplate =
  | "order.placed"
  | "payment.paid"
  | "order.shipped"
  | "auth.welcome"
  | "test.send";

export interface RenderedMessage {
  subject?: string;
  text: string;
  html?: string;
}

type Data = Record<string, unknown>;

const money = (value: unknown) => `${Math.round(Number(value ?? 0)).toLocaleString("fa-IR")} تومان`;
const text = (value: unknown) => (value == null || value === "" ? "" : String(value));

function layout(title: string, rows: string[], footer = "فروشگاه آگاهی — پوشاک دست‌دوز") {
  return `<!doctype html><html dir="rtl" lang="fa"><body style="margin:0;background:#f6f3ee;font-family:Tahoma,Segoe UI,sans-serif;color:#231f1c">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#1d1a17;color:#f6f3ee;border-radius:18px 18px 0 0;padding:22px 26px">
      <div style="font-size:13px;letter-spacing:.18em;opacity:.7">AGHACI</div>
      <div style="font-size:20px;margin-top:6px">${title}</div>
    </div>
    <div style="background:#ffffff;border:1px solid #e7e0d6;border-top:0;border-radius:0 0 18px 18px;padding:26px">
      ${rows.join("\n")}
      <p style="margin:26px 0 0;font-size:12px;color:#8a8178">${footer}</p>
    </div>
  </div></body></html>`;
}

function row(label: string, value: string) {
  return `<div style="display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px dashed #eee7dc;font-size:14px">
    <span style="color:#8a8178">${label}</span><span style="font-weight:600">${value}</span></div>`;
}

function itemsTable(items: unknown) {
  const list = Array.isArray(items) ? (items as { name?: string; quantity?: number; totalPrice?: number }[]) : [];
  if (!list.length) return "";
  const rows = list
    .map(
      (item) =>
        `<tr><td style="padding:7px 0;font-size:13px">${text(item.name)}</td><td style="padding:7px 0;font-size:13px;text-align:center">${Number(item.quantity ?? 0).toLocaleString("fa-IR")}</td><td style="padding:7px 0;font-size:13px;text-align:left">${money(item.totalPrice)}</td></tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:14px 0"><thead><tr style="font-size:11px;color:#8a8178"><th style="text-align:right">کالا</th><th>تعداد</th><th style="text-align:left">مبلغ</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildTemplate(template: NotificationTemplate, data: Data): RenderedMessage {
  switch (template) {
    case "order.placed": {
      const number = text(data.orderNumber);
      const title = `سفارش ${number} ثبت شد`;
      return {
        subject: `ثبت سفارش ${number} — آگاهی`,
        text: [
          `سفارش شما با شماره ${number} ثبت شد.`,
          `مبلغ کل: ${money(data.total)}`,
          "برای نهایی‌شدن، پرداخت را تکمیل کنید. سفارش تا ۳۰ دقیقه رزرو می‌ماند.",
        ].join("\n"),
        html: layout(title, [
          `<p style="font-size:14px;line-height:2;margin:0 0 14px">سفارش شما ثبت شد. برای نهایی‌شدن، پرداخت را تکمیل کنید.</p>`,
          row("شماره سفارش", number),
          itemsTable(data.items),
          row("مبلغ قابل پرداخت", money(data.total)),
          data.payUrl
            ? `<p style="margin:22px 0 0"><a href="${text(data.payUrl)}" style="display:inline-block;background:#b5654a;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:14px">پرداخت سفارش</a></p>`
            : "",
        ]),
      };
    }
    case "payment.paid": {
      const number = text(data.orderNumber);
      return {
        subject: `پرداخت سفارش ${number} تأیید شد — آگاهی`,
        text: [
          `پرداخت سفارش ${number} با موفقیت انجام شد.`,
          data.refId ? `کد پیگیری: ${text(data.refId)}` : "",
          `مبلغ: ${money(data.total)}`,
          "سفارش شما در صف آماده‌سازی قرار گرفت.",
        ]
          .filter(Boolean)
          .join("\n"),
        html: layout(`پرداخت ${number} تأیید شد`, [
          `<p style="font-size:14px;line-height:2;margin:0 0 14px">پرداخت شما با موفقیت تأیید شد و سفارش در صف آماده‌سازی قرار گرفت.</p>`,
          row("شماره سفارش", number),
          data.refId ? row("کد پیگیری پرداخت", text(data.refId)) : "",
          row("مبلغ پرداخت‌شده", money(data.total)),
          data.orderUrl
            ? `<p style="margin:22px 0 0"><a href="${text(data.orderUrl)}" style="display:inline-block;background:#1d1a17;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:14px">پیگیری سفارش</a></p>`
            : "",
        ]),
      };
    }
    case "order.shipped": {
      const number = text(data.orderNumber);
      return {
        subject: `سفارش ${number} ارسال شد — آگاهی`,
        text: [
          `سفارش ${number} تحویل پست شد.`,
          data.trackingNumber ? `کد رهگیری: ${text(data.trackingNumber)}` : "",
          data.carrier ? `شرکت حمل: ${text(data.carrier)}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        html: layout(`سفارش ${number} ارسال شد`, [
          `<p style="font-size:14px;line-height:2;margin:0 0 14px">سفارش شما تحویل شرکت حمل شد. با کد رهگیری وضعیت مرسوله را پیگیری کنید.</p>`,
          row("شماره سفارش", number),
          data.carrier ? row("شرکت حمل", text(data.carrier)) : "",
          data.trackingNumber ? row("کد رهگیری", text(data.trackingNumber)) : "",
        ]),
      };
    }
    case "auth.welcome": {
      return {
        subject: "به آگاهی خوش آمدید",
        text: `سلام ${text(data.name) || "دوست عزیز"}، حساب شما ساخته شد.`,
        html: layout("خوش آمدید", [
          `<p style="font-size:14px;line-height:2">سلام ${text(data.name) || "دوست عزیز"}، حساب شما ساخته شد. کالکشن‌های جدید هر هفته اضافه می‌شوند.</p>`,
        ]),
      };
    }
    case "test.send":
    default: {
      const stamp = new Date().toLocaleString("fa-IR");
      return {
        subject: "پیام آزمایشی — آگاهی",
        text: `این یک پیام آزمایشی از پنل مدیریت آگاهی است. زمان: ${stamp}`,
        html: layout("پیام آزمایشی", [
          `<p style="font-size:14px;line-height:2">این پیام از پنل مدیریت ارسال شد تا مسیر ایمیل/پیامک تست شود.</p>`,
          row("زمان", stamp),
        ]),
      };
    }
  }
}

export function isNotificationTemplate(value: string): value is NotificationTemplate {
  return ["order.placed", "payment.paid", "order.shipped", "auth.welcome", "test.send"].includes(value);
}
