import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";

import { JsonLogger } from "./json.logger";
import type { RequestWithContext } from "./request-context";

/**
 * Last line of defence: converts anything thrown into a JSON body that carries
 * the request id, and logs 5xx with a stack while keeping 4xx quiet (a 404 for
 * a crawler is not an incident). Stack traces never leak to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: JsonLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = request?.requestId;

    const original = exception instanceof HttpException ? exception.getResponse() : null;
    const payload =
      original && typeof original === "object"
        ? (original as Record<string, unknown>)
        : { message: typeof original === "string" ? original : undefined };

    if (status >= 500) {
      this.logger.error("http.exception", {
        requestId,
        method: request?.method,
        path: request?.originalUrl?.split("?")[0],
        status,
        error: exception instanceof Error ? { name: exception.name, message: exception.message, stack: exception.stack } : exception,
      });
    } else {
      this.logger.debug("http.exception", {
        requestId,
        method: request?.method,
        path: request?.originalUrl?.split("?")[0],
        status,
        message: payload.message ?? exception,
      });
    }

    if (response.headersSent) return;
    response.status(status).json({
      ...payload,
      statusCode: status,
      message: payload.message ?? (status >= 500 ? "Internal server error" : exception),
      path: request?.originalUrl?.split("?")[0],
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
