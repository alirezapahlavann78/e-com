import type { LoggerService } from "@nestjs/common";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|otp/i;

/**
 * Structured, line-oriented logger.
 *
 * One JSON object per line on stdout — the shape every log shipper (Loki,
 * Datadog, CloudWatch, `jq`) expects. `LOG_FORMAT=pretty` prints a readable
 * single line instead, and `LOG_LEVEL` (debug|info|warn|error, default info)
 * filters noise. Secrets are redacted before they ever reach the stream.
 */
export class JsonLogger implements LoggerService {
  private readonly threshold: number;
  private readonly pretty: boolean;

  constructor(
    private readonly context?: string,
    options: { level?: string; pretty?: boolean } = {},
  ) {
    const level = (options.level ?? process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
    this.threshold = LEVEL_WEIGHT[level] ?? LEVEL_WEIGHT.info;
    this.pretty = options.pretty ?? (process.env.LOG_FORMAT ?? "").toLowerCase() === "pretty";
  }

  private write(level: Level, message: unknown, meta?: unknown, context?: string) {
    if (LEVEL_WEIGHT[level] < this.threshold) return;
    const record: Record<string, unknown> = {
      time: new Date().toISOString(),
      level,
      service: "api",
      context: context ?? this.context ?? undefined,
      message: this.normalizeMessage(message),
    };
    const details = this.redact(meta);
    if (details !== undefined && details !== null && details !== "") {
      if (typeof details === "object" && !Array.isArray(details)) Object.assign(record, details);
      else record.details = details;
    }
    if (this.pretty) {
      const { time, context: ctx, message: msg, ...rest } = record;
      delete rest.level;
      const extras = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
      process.stdout.write(
        `${String(time)} ${level.toUpperCase().padEnd(5)} ${ctx ? `[${String(ctx)}] ` : ""}${String(msg)}${extras}\n`,
      );
      return;
    }
    process.stdout.write(`${JSON.stringify(record)}\n`);
  }

  private normalizeMessage(message: unknown): string {
    if (message instanceof Error) return message.message;
    if (typeof message === "string") return message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  private redact(value: unknown, depth = 0): unknown {
    if (value == null || depth > 4) return value;
    if (Array.isArray(value)) return value.slice(0, 50).map((item) => this.redact(item, depth + 1));
    if (typeof value !== "object") return value;
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE.test(key) ? "[redacted]" : this.redact(entry, depth + 1);
    }
    return out;
  }

  /** Nest calls `log(message, context)`; some call sites pass a meta object too. */
  private emit(level: Level, message: unknown, rest: unknown[], trace?: string) {
    let context: string | undefined;
    let meta: unknown = trace ? { trace } : undefined;
    for (const item of rest) {
      if (typeof item === "string") {
        if (!context) context = item;
      } else if (item && typeof item === "object" && !meta) {
        meta = item;
      }
    }
    this.write(level, message, meta, context ?? this.context);
  }

  log(message: unknown, ...rest: unknown[]) {
    this.emit("info", message, rest);
  }

  info(message: unknown, ...rest: unknown[]) {
    this.emit("info", message, rest);
  }

  warn(message: unknown, ...rest: unknown[]) {
    this.emit("warn", message, rest);
  }

  debug(message: unknown, ...rest: unknown[]) {
    this.emit("debug", message, rest);
  }

  verbose(message: unknown, ...rest: unknown[]) {
    this.emit("debug", message, rest);
  }

  /** `error(message, stack?, context?)` per the Nest contract. */
  error(message: unknown, ...rest: unknown[]) {
    const trace = typeof rest[0] === "string" ? rest[0] : undefined;
    const tail = typeof rest[0] === "string" ? rest.slice(1) : rest;
    this.emit("error", message, tail, trace);
  }
}
