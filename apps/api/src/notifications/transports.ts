import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import nodemailer, { type Transporter } from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface DeliveryResult {
  provider: string;
  providerRef?: string;
}

export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage): Promise<DeliveryResult>;
}

/**
 * Real SMTP delivery (Mailtrap, Gmail app-password, SES SMTP, …). Configured
 * with MAIL_HOST / MAIL_PORT / MAIL_USER / MAIL_PASSWORD / MAIL_FROM; the
 * transporter is created lazily so a misconfigured server only fails the
 * message that needs it, not API boot.
 */
export class SmtpEmailTransport implements EmailTransport {
  readonly name = "smtp";
  private transporter?: Transporter;

  constructor(
    private readonly config: {
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      password?: string;
      from: string;
    },
  ) {}

  private client() {
    this.transporter ??= nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.user ? { user: this.config.user, pass: this.config.password ?? "" } : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    return this.transporter;
  }

  async send(message: EmailMessage): Promise<DeliveryResult> {
    const info = await this.client().sendMail({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { provider: this.name, providerRef: info.messageId };
  }
}

/**
 * Offline transport used when SMTP is not configured: writes a real .eml file
 * (RFC 822) so the message can be opened in any mail client and the whole
 * pipeline stays testable without an external service.
 */
export class FileEmailTransport implements EmailTransport {
  readonly name = "file";

  constructor(private readonly directory: string, private readonly from: string) {
    mkdirSync(directory, { recursive: true });
  }

  async send(message: EmailMessage): Promise<DeliveryResult> {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = message.to.replace(/[^a-z0-9@._-]/gi, "_");
    const path = join(this.directory, `${stamp}-${safe}.eml`);
    mkdirSync(dirname(path), { recursive: true });
    const body = [
      `From: ${this.from}`,
      `To: ${message.to}`,
      `Subject: =?UTF-8?B?${Buffer.from(message.subject, "utf8").toString("base64")}?=`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="utf-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      message.html ?? message.text,
    ].join("\r\n");
    writeFileSync(path, body, "utf8");
    return { provider: this.name, providerRef: path };
  }
}

export interface SmsMessage {
  to: string;
  text: string;
}

export interface SmsTransport {
  readonly name: string;
  send(message: SmsMessage): Promise<DeliveryResult>;
}

/**
 * Kavenegar REST driver (Iranian SMS provider). Needs KAVENEGAR_API_KEY and an
 * optional KAVENEGAR_SENDER. Uses the `sms/send.json` endpoint.
 */
export class KavenegarSmsTransport implements SmsTransport {
  readonly name = "kavenegar";

  constructor(private readonly config: { apiKey: string; sender?: string }) {}

  async send(message: SmsMessage): Promise<DeliveryResult> {
    const params = new URLSearchParams({ receptor: message.to, message: message.text });
    if (this.config.sender) params.set("sender", this.config.sender);
    const response = await fetch(
      `https://api.kavenegar.com/v1/${encodeURIComponent(this.config.apiKey)}/sms/send.json?${params.toString()}`,
      { signal: AbortSignal.timeout(15_000) },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      return?: { status?: number; message?: string };
      entries?: { messageid?: number }[];
    };
    if (!response.ok || payload.return?.status !== 200) {
      throw new Error(`Kavenegar: ${payload.return?.message ?? `HTTP ${response.status}`}`);
    }
    return { provider: this.name, providerRef: payload.entries?.[0]?.messageid?.toString() };
  }
}

/**
 * Development SMS transport. The message is not sent anywhere; it is written to
 * the process log with a clear `[sms:log]` prefix so nobody mistakes it for a
 * delivered text.
 */
export class LogSmsTransport implements SmsTransport {
  readonly name = "log";

  constructor(private readonly write: (line: string) => void) {}

  async send(message: SmsMessage): Promise<DeliveryResult> {
    this.write(`[sms:log] to=${message.to} ${message.text}`);
    return { provider: this.name, providerRef: `log_${Date.now().toString(36)}` };
  }
}
