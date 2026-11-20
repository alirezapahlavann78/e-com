import { randomUUID } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { JsonLogger } from "./json.logger";

const SKIP = [/^\/uploads\//, /^\/api\/docs/, /^\/favicon/, /\.(css|js|png|jpe?g|svg|webp|woff2?)$/i];
const SLOW_REQUEST_MS = Number(process.env.SLOW_REQUEST_MS ?? 1_500);

export interface RequestWithContext extends Request {
  requestId?: string;
  startedAt?: number;
  user?: { id?: string };
}

/**
 * Attaches a request id, echoes it back to the client and logs one structured
 * line per request with status + duration. The same id appears in error
 * responses, so a bug report can be traced to a single log line.
 */
export function requestContext(logger: JsonLogger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const context = req as RequestWithContext;
    const incoming = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : "";
    const requestId = /^[A-Za-z0-9._-]{6,64}$/.test(incoming) ? incoming : randomUUID();
    context.requestId = requestId;
    context.startedAt = Date.now();
    res.setHeader("x-request-id", requestId);

    const path = req.originalUrl.split("?")[0] ?? req.originalUrl;
    if (SKIP.some((pattern) => pattern.test(path))) return next();

    res.on("finish", () => {
      const durationMs = Date.now() - (context.startedAt ?? Date.now());
      const user = context.user;
      const meta = {
        requestId,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs,
        ip: req.ip,
        userId: user?.id,
      };
      if (res.statusCode >= 500) logger.error("http.request", meta);
      else if (res.statusCode >= 400) logger.warn("http.request", meta);
      else if (durationMs > SLOW_REQUEST_MS) logger.warn("http.slow_request", meta);
      else logger.log("http.request", meta);
    });

    next();
  };
}
