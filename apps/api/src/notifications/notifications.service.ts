import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { NotificationChannel, NotificationMessage, Order, Payment, Prisma } from "@ecom/db";

import { PrismaService } from "../prisma/prisma.service";
import { buildTemplate, isNotificationTemplate, type NotificationTemplate } from "./templates";
import {
  FileEmailTransport,
  KavenegarSmsTransport,
  LogSmsTransport,
  SmtpEmailTransport,
  type DeliveryResult,
  type EmailTransport,
  type SmsTransport,
} from "./transports";

const BACKOFF_MINUTES = [1, 5, 15, 60, 180];
const CLAIM_WINDOW_MS = 120_000;

/** Digits typed on an Iranian keyboard / RTL copy-paste. */
export function normalizePhone(value?: string | null): string | undefined {
  if (!value) return undefined;
  const map: Record<string, string> = { "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9" };
  const digits = value
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .replace(/[^\d+]/g, "");
  if (digits.startsWith("+98")) return `0${digits.slice(3)}`;
  if (digits.startsWith("98") && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) return `0${digits}`;
  return digits.length >= 10 ? digits : undefined;
}

const money = (value: unknown) => `${Math.round(Number(value ?? 0)).toLocaleString("fa-IR")} تومان`;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private email?: EmailTransport;
  private sms?: SmsTransport;

  constructor(private readonly prisma: PrismaService) {}

  private storefrontUrl() {
    return (process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000").replace(/\/$/, "");
  }

  private emailTransport(): EmailTransport {
    if (this.email) return this.email;
    const host = process.env.MAIL_HOST?.trim();
    if (host) {
      this.email = new SmtpEmailTransport({
        host,
        port: Number(process.env.MAIL_PORT ?? 587),
        secure: (process.env.MAIL_SECURE ?? "false").toLowerCase() === "true",
        user: process.env.MAIL_USER,
        password: process.env.MAIL_PASSWORD,
        from: process.env.MAIL_FROM ?? "آگاهی <no-reply@aghaci.local>",
      });
    } else {
      this.email = new FileEmailTransport(
        process.env.MAIL_FILE_DIR ?? "uploads/mail",
        process.env.MAIL_FROM ?? "آگاهی <no-reply@aghaci.local>",
      );
    }
    return this.email;
  }

  private smsTransport(): SmsTransport {
    if (this.sms) return this.sms;
    const apiKey = process.env.KAVENEGAR_API_KEY?.trim();
    if (apiKey) {
      this.sms = new KavenegarSmsTransport({ apiKey, sender: process.env.KAVENEGAR_SENDER });
    } else {
      this.sms = new LogSmsTransport((line) => this.logger.log(line));
    }
    return this.sms;
  }

  transportsInfo() {
    return {
      email: {
        name: this.emailTransport().name,
        configured: Boolean(process.env.MAIL_HOST),
        from: process.env.MAIL_FROM ?? "آگاهی <no-reply@aghaci.local>",
      },
      sms: {
        name: this.smsTransport().name,
        configured: Boolean(process.env.KAVENEGAR_API_KEY),
        sender: process.env.KAVENEGAR_SENDER ?? null,
      },
      worker: {
        intervalMs: Number(process.env.NOTIFICATIONS_INTERVAL_MS ?? 15_000),
        maxAttempts: Number(process.env.NOTIFICATIONS_MAX_ATTEMPTS ?? 5),
      },
    };
  }

  async enqueue(input: {
    channel: NotificationChannel;
    template: NotificationTemplate;
    to?: string | null;
    data?: Record<string, unknown>;
    orderId?: string | null;
    dedupeKey?: string;
  }): Promise<NotificationMessage | null> {
    const recipient = input.channel === "SMS" ? normalizePhone(input.to) : input.to?.trim();
    if (!recipient) return null;
    if (!(await this.channelEnabled(input.channel))) {
      this.logger.debug(`notification ${input.template} skipped: ${input.channel} channel disabled in settings`);
      return null;
    }
    const rendered = buildTemplate(input.template, input.data ?? {});
    try {
      return await this.prisma.notificationMessage.create({
        data: {
          channel: input.channel,
          template: input.template,
          recipient,
          subject: rendered.subject,
          body: rendered.text,
          orderId: input.orderId ?? null,
          dedupeKey: input.dedupeKey,
          maxAttempts: Number(process.env.NOTIFICATIONS_MAX_ATTEMPTS ?? 5),
          metadata: { html: rendered.html ?? null, data: input.data ?? {} } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // dedupeKey is unique: replaying the same event must be a no-op, not a 500.
      if ((error as { code?: string }).code === "P2002") {
        this.logger.debug(`duplicate notification skipped (${input.dedupeKey})`);
        return null;
      }
      throw error;
    }
  }

  /** Admin switch (`notifications.email` / `notifications.sms`), env as fallback. */
  private async channelEnabled(channel: NotificationChannel): Promise<boolean> {
    const key = channel === "EMAIL" ? "notifications.email" : "notifications.sms";
    const envValue = process.env[channel === "EMAIL" ? "NOTIFICATIONS_EMAIL_ENABLED" : "NOTIFICATIONS_SMS_ENABLED"];
    const row = await this.prisma.storeSetting.findUnique({ where: { key } }).catch(() => null);
    const stored = (row?.value as { enabled?: boolean } | null)?.enabled;
    if (typeof stored === "boolean") return stored;
    return envValue ? envValue.toLowerCase() !== "false" : true;
  }

  private orderItems(order: Order & { items?: { name: string; quantity: number; totalPrice: unknown }[] }) {
    return (order.items ?? []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      totalPrice: Number(item.totalPrice),
    }));
  }

  private phoneOfOrder(order: Order): string | undefined {
    const address = order.shippingAddress as { phone?: string } | null;
    return normalizePhone(address?.phone);
  }

  async notifyOrderPlaced(order: Order & { items?: { name: string; quantity: number; totalPrice: unknown }[] }) {
    const items = this.orderItems(order);
    const data = { orderNumber: order.number, total: Number(order.total), items, payUrl: `${this.storefrontUrl()}/checkout/result?order=${encodeURIComponent(order.number)}` };
    await this.enqueue({ channel: "EMAIL", template: "order.placed", to: order.email, data, orderId: order.id, dedupeKey: `order.placed:${order.id}` });
    await this.enqueue({ channel: "SMS", template: "order.placed", to: this.phoneOfOrder(order), data, orderId: order.id, dedupeKey: `order.placed:sms:${order.id}` });
  }

  async notifyPaymentPaid(order: Order, payment: Payment) {
    const data = {
      orderNumber: order.number,
      total: Number(payment.amount),
      refId: payment.refId,
      orderUrl: `${this.storefrontUrl()}/account/orders`,
    };
    await this.enqueue({ channel: "EMAIL", template: "payment.paid", to: order.email, data, orderId: order.id, dedupeKey: `payment.paid:${payment.id}` });
    await this.enqueue({ channel: "SMS", template: "payment.paid", to: this.phoneOfOrder(order), data, orderId: order.id, dedupeKey: `payment.paid:sms:${payment.id}` });
  }

  async notifyOrderShipped(order: Order, shipment?: { carrier?: string | null; trackingNumber?: string | null } | null) {
    const data = {
      orderNumber: order.number,
      carrier: shipment?.carrier ?? null,
      trackingNumber: shipment?.trackingNumber ?? null,
    };
    await this.enqueue({ channel: "EMAIL", template: "order.shipped", to: order.email, data, orderId: order.id, dedupeKey: `order.shipped:${order.id}` });
    await this.enqueue({ channel: "SMS", template: "order.shipped", to: this.phoneOfOrder(order), data, orderId: order.id, dedupeKey: `order.shipped:sms:${order.id}` });
  }

  async notifyWelcome(user: { id: string; email: string; firstName?: string | null }) {
    await this.enqueue({
      channel: "EMAIL",
      template: "auth.welcome",
      to: user.email,
      data: { name: user.firstName ?? null },
      dedupeKey: `auth.welcome:${user.id}`,
    });
  }

  /** Manual "send test" from the admin panel; delivers immediately. */
  async sendTest(channel: NotificationChannel, to: string) {
    if (channel === "EMAIL" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      throw new NotFoundException("ایمیل معتبر نیست");
    }
    if (channel === "SMS" && !normalizePhone(to)) throw new NotFoundException("شماره موبایل معتبر نیست");
    const message = await this.enqueue({
      channel,
      template: "test.send",
      to,
      data: {},
      dedupeKey: `test:${channel}:${to}:${Date.now()}`,
    });
    if (!message) throw new NotFoundException("پیام ساخته نشد");
    const delivered = await this.deliverNow(message.id);
    return { message: delivered };
  }

  private async deliver(message: NotificationMessage): Promise<DeliveryResult> {
    if (message.channel === "EMAIL") {
      return this.emailTransport().send({
        to: message.recipient,
        subject: message.subject ?? "پیام از فروشگاه آگاهی",
        text: message.body,
        html: ((message.metadata as { html?: string } | null)?.html) ?? undefined,
      });
    }
    return this.smsTransport().send({ to: message.recipient, text: message.body });
  }

  private async claim(id: string): Promise<boolean> {
    const now = new Date();
    const claimed = await this.prisma.notificationMessage.updateMany({
      where: {
        id,
        status: "PENDING",
        nextAttemptAt: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      data: { lockedUntil: new Date(now.getTime() + CLAIM_WINDOW_MS) },
    });
    return claimed.count === 1;
  }

  private async sendClaimed(message: NotificationMessage): Promise<NotificationMessage> {
    try {
      const result = await this.deliver(message);
      return await this.prisma.notificationMessage.update({
        where: { id: message.id },
        data: {
          status: "SENT",
          attempts: message.attempts + 1,
          sentAt: new Date(),
          lockedUntil: null,
          provider: result.provider,
          providerRef: result.providerRef,
          lastError: null,
        },
      });
    } catch (error) {
      const attempts = message.attempts + 1;
      const exhausted = attempts >= message.maxAttempts;
      const delayMinutes = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)] ?? 60;
      const failure = await this.prisma.notificationMessage.update({
        where: { id: message.id },
        data: {
          attempts,
          status: exhausted ? "FAILED" : "PENDING",
          lockedUntil: null,
          lastError: (error as Error).message.slice(0, 500),
          nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
        },
      });
      this.logger.warn(
        `notification ${message.id} (${message.channel}/${message.template}) attempt ${attempts} failed: ${(error as Error).message}`,
      );
      return failure;
    }
  }

  /** Claim + deliver one message right away (admin retry / test send). */
  async deliverNow(id: string): Promise<NotificationMessage> {
    const message = await this.prisma.notificationMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException("پیام یافت نشد");
    if (message.status === "SENT") return message;
    const claimed = await this.claim(id);
    if (!claimed) {
      // Another worker owns it (or the schedule says "later"); fetch fresh state.
      return (await this.prisma.notificationMessage.findUnique({ where: { id } })) ?? message;
    }
    return this.sendClaimed(message);
  }

  /** Worker tick. Safe to call from several processes at once. */
  async dispatchBatch(limit = 25) {
    const now = new Date();
    const due = await this.prisma.notificationMessage.findMany({
      where: {
        status: "PENDING",
        nextAttemptAt: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    let sent = 0;
    let failed = 0;
    for (const message of due) {
      if (!(await this.claim(message.id))) continue;
      const result = await this.sendClaimed({ ...message, lockedUntil: new Date(now.getTime() + CLAIM_WINDOW_MS) });
      if (result.status === "SENT") sent += 1;
      else failed += 1;
    }
    return { due: due.length, sent, failed };
  }

  async retry(id: string) {
    const message = await this.prisma.notificationMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException("پیام یافت نشد");
    const reset = await this.prisma.notificationMessage.update({
      where: { id },
      data: {
        status: "PENDING",
        attempts: 0,
        nextAttemptAt: new Date(),
        lockedUntil: null,
        lastError: null,
        maxAttempts: Math.max(message.maxAttempts, 5),
      },
    });
    return this.dispatchBatch(1).then(() => this.prisma.notificationMessage.findUnique({ where: { id: reset.id } }));
  }

  async cancel(id: string) {
    const message = await this.prisma.notificationMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException("پیام یافت نشد");
    if (message.status === "SENT") throw new NotFoundException("پیام ارسال‌شده قابل لغو نیست");
    return this.prisma.notificationMessage.update({
      where: { id },
      data: { status: "CANCELLED", lockedUntil: null },
    });
  }

  async list(query: { status?: string; channel?: string; q?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
    const where: Prisma.NotificationMessageWhereInput = {};
    if (query.status) where.status = query.status as never;
    if (query.channel) where.channel = query.channel as never;
    if (query.q) {
      where.OR = [
        { recipient: { contains: query.q, mode: "insensitive" } },
        { subject: { contains: query.q, mode: "insensitive" } },
        { template: { contains: query.q } },
      ];
    }
    const [items, total, byStatus, byChannel] = await Promise.all([
      this.prisma.notificationMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationMessage.count({ where }),
      this.prisma.notificationMessage.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.notificationMessage.groupBy({ by: ["channel"], _count: { _all: true } }),
    ]);
    return {
      items,
      total,
      page,
      limit,
      stats: {
        status: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
        channel: byChannel.map((row) => ({ channel: row.channel, count: row._count._all })),
      },
      transports: this.transportsInfo(),
    };
  }

  /** Keep the table from growing forever; called hourly by the worker. */
  async prune(olderThanDays = 30) {
    const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
    const deleted = await this.prisma.notificationMessage.deleteMany({
      where: { status: { in: ["SENT", "CANCELLED"] }, createdAt: { lt: cutoff } },
    });
    return deleted.count;
  }

  /** Used by the admin page for the "compose" preview. */
  preview(template: string, data: Record<string, unknown>) {
    if (!isNotificationTemplate(template)) throw new NotFoundException("قالب یافت نشد");
    return buildTemplate(template, data);
  }

  summaryLine(order: Order) {
    return `سفارش ${order.number} — ${money(order.total)}`;
  }
}
