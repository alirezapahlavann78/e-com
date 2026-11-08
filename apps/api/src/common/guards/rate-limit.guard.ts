import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RATE_LIMIT_KEY } from "../decorators/rate-limit.decorator";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const cfg = this.reflector.getAllAndOverride<{ limit: number; windowMs: number } | undefined>(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (!cfg) return true;
    const req = context.switchToHttp().getRequest();
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const key = `${ip}:${req.method}:${req.route?.path ?? req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + cfg.windowMs }); return true; }
    if (bucket.count >= cfg.limit) throw new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS);
    bucket.count += 1;
    return true;
  }
}
