import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";

import { NotificationService } from "./notifications.service";

/**
 * Outbox dispatcher.
 *
 * Messages are written inside the same transaction-ish flow as the business
 * event, then a timer delivers them with retries/backoff. This is what keeps a
 * slow or down SMTP/SMS provider from blocking checkout, while still giving the
 * admin panel an honest per-message state (`PENDING → SENT | FAILED`).
 *
 * `NOTIFICATIONS_INTERVAL_MS` tunes the tick (default 15s); setting it to `0`
 * disables the worker (messages stay queued and can be sent manually from the
 * admin panel — useful for tests).
 */
@Injectable()
export class NotificationsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsWorker.name);
  private timer?: NodeJS.Timeout;
  private pruneTimer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly notifications: NotificationService) {}

  onModuleInit() {
    const interval = Number(process.env.NOTIFICATIONS_INTERVAL_MS ?? 15_000);
    if (!Number.isFinite(interval) || interval <= 0) {
      this.logger.log("notification worker disabled (NOTIFICATIONS_INTERVAL_MS=0)");
      return;
    }
    this.timer = setInterval(() => void this.tick(), interval);
    this.timer.unref();
    this.pruneTimer = setInterval(() => void this.prune(), 3_600_000);
    this.pruneTimer.unref();
    // First pass shortly after boot so a queue left over from the previous
    // process drains without waiting a full interval.
    setTimeout(() => void this.tick(), 2_000).unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.notifications.dispatchBatch();
      if (result.due > 0) {
        this.logger.log(`notification tick: ${result.sent} sent, ${result.failed} retried/failed of ${result.due}`);
      }
    } catch (error) {
      this.logger.error(`notification tick failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  private async prune() {
    try {
      const removed = await this.notifications.prune();
      if (removed) this.logger.log(`pruned ${removed} delivered notifications older than 30 days`);
    } catch (error) {
      this.logger.warn(`notification prune failed: ${(error as Error).message}`);
    }
  }
}
