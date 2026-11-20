import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { PrismaService } from "../../prisma/prisma.service";
import { RATE_LIMIT_KEY } from "../decorators/rate-limit.decorator";

type Bucket = { count: number; resetAt: number };
/** Fallback when the database is unreachable — keeps the guard from becoming an outage amplifier. */
const fallbackBuckets = new Map<string, Bucket>();
let fallbackPruneTick = 0;

/**
 * Fixed-window limiter backed by Postgres.
 *
 * Counting in the database (instead of a process-local Map) means the limit
 * holds across restarts and across several API replicas — the in-memory map
 * only exists as a degraded mode if a write fails. Counters live in
 * `RateLimitCounter` with a composite `(key, windowStart)` primary key, so the
 * increment is a single atomic upsert per limited request.
 *
 * Only routes annotated with `@RateLimit(limit, windowMs)` are counted, keeping
 * the read-heavy catalog endpoints free of extra writes.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<{ limit: number; windowMs: number } | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!config) return true;

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const forwarded =
      typeof request.headers["x-forwarded-for"] === "string" ? request.headers["x-forwarded-for"].split(",")[0]?.trim() : undefined;
    const ip = forwarded || request.ip || "unknown";
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const key = `${route}:${ip}`.slice(0, 200);
    const now = Date.now();
    const windowStart = new Date(Math.floor(now / config.windowMs) * config.windowMs);
    const expiresAt = new Date(windowStart.getTime() + config.windowMs);

    let count: number;
    let resetAt = expiresAt.getTime();
    try {
      const row = await this.prisma.rateLimitCounter.upsert({
        where: { key_windowStart: { key, windowStart } },
        create: { key, windowStart, count: 1, expiresAt },
        update: { count: { increment: 1 } },
        select: { count: true, expiresAt: true },
      });
      count = row.count;
      resetAt = row.expiresAt.getTime();
      // Cheap housekeeping: 1 in 50 requests sweeps expired windows.
      fallbackPruneTick += 1;
      if (fallbackPruneTick % 50 === 0) {
        await this.prisma.rateLimitCounter.deleteMany({ where: { expiresAt: { lt: new Date(now - config.windowMs) } } }).catch(() => undefined);
      }
    } catch (error) {
      this.logger.warn(`rate limit store unavailable, using in-memory fallback: ${(error as Error).message}`);
      count = this.incrementFallback(key, now, config.windowMs, resetAt);
    }

    if (typeof response?.setHeader === "function") {
      response.setHeader("x-ratelimit-limit", String(config.limit));
      response.setHeader("x-ratelimit-remaining", String(Math.max(0, config.limit - count)));
      response.setHeader("x-ratelimit-reset", String(Math.ceil(resetAt / 1000)));
    }

    if (count > config.limit) {
      const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
      if (typeof response?.setHeader === "function") response.setHeader("retry-after", String(retryAfter));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: "RATE_LIMITED",
          message: `Too many requests. Try again in ${retryAfter} second(s).`,
          retryAfterSeconds: retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private incrementFallback(key: string, now: number, windowMs: number, resetAt: number): number {
    const existing = fallbackBuckets.get(key);
    if (!existing || existing.resetAt <= now) {
      fallbackBuckets.set(key, { count: 1, resetAt: resetAt + windowMs > now ? resetAt : now + windowMs });
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }
}
