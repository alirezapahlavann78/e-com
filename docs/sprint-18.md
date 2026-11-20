# Sprint 18 — real payment gateway, transactional email/SMS, production logging

Date: 2026-11-20

This sprint replaced the single hardcoded "sandbox" payment helper with a gateway
layer, added a DB-backed notification outbox for email and SMS, moved rate
limiting from process memory into Postgres, and gave the API structured logs.

Everything below is DB-backed and verified against a running API (`curl`), not
mocked.

## 1. Payment gateways

`apps/api/src/payments/`

| File | Role |
| --- | --- |
| `payment-gateway.ts` | Contract (`createPayment` / `verifyPayment`), Toman→Rial helper |
| `sandbox.gateway.ts` | Local driver: hosted-in-repo confirm page, no money |
| `zarinpal.gateway.ts` | Real Zarinpal REST v4 (request / StartPay / verify), production or `sandbox.zarinpal.com` |
| `payment-gateway.factory.ts` | Resolves the active driver from store settings → env, exposes warnings |
| `payments.service.ts` | Initiation, callbacks, idempotent finalisation, admin listing |
| `payments.controller.ts` | Storefront + admin routes |

Gateway selection lives in the `payment.gateway` store setting (admin →
تنظیمات → درگاه پرداخت), with `PAYMENT_PROVIDER` / `ZARINPAL_*` env as fallback.
Selecting Zarinpal without a merchant id does **not** silently fall back to a
fake success: checkout still creates the order, returns `paymentError`, and
`POST /payments/orders/:number/retry` answers `503 PAYMENT_GATEWAY_ERROR` with a
Persian message.

Flow (identical shape for both drivers):

1. `POST /checkout` creates the order and calls `PaymentsService.initiate`.
2. The driver allocates an authority and returns a `redirectUrl`.
3. The browser lands on the provider (Zarinpal) or on `/checkout/sandbox`.
4. Provider → `GET /api/payments/callback/:provider?Authority&Status`.
   Sandbox → `POST /api/payments/sandbox/complete {authority, outcome}`.
5. `verifyPayment` is called; only `PAID` marks the order paid.
6. `finalize` runs once (idempotency key `provider:paymentId:status`), writes a
   `PaymentEvent`, restores stock and discounts on failure, queues notifications.
7. The browser is redirected to `/checkout/result?order=…&payment=…`.

New/changed endpoints:

- `POST /api/payments/orders/:orderId/initiate` (rate-limited 15/min)
- `POST /api/payments/orders/:number/retry` (rate-limited 10/min) — re-issues an
  authority for an unpaid/failed order
- `GET  /api/payments/status/:number` — public, minimal order state for the result page
- `GET  /api/payments/sandbox/session?authority=…`
- `POST /api/payments/sandbox/complete` (rate-limited 20/min)
- `GET  /api/payments/callback/:provider` — 302 to the storefront, never raw JSON
- `GET  /api/admin/payments` + `GET /api/admin/payments/config`

Schema: `Payment.refId`, `Payment.callbackUrl`, `PaymentEvent`
(`REQUEST`, `REQUEST_ERROR`, `VERIFY`, `CALLBACK`) with a unique idempotency key.

Storefront: `/checkout/sandbox` (test gateway UI with amount/order/session
state), `/checkout/result` (authoritative status, receipt reference, retry).

## 2. Transactional email + SMS

`apps/api/src/notifications/`

- `NotificationMessage` is a real outbox: channel, template, recipient, rendered
  body, status (`PENDING|SENT|FAILED|CANCELLED`), attempts, backoff, last error,
  provider reference, optional `dedupeKey` (unique — replays are no-ops).
- `NotificationsWorker` drains the queue every 15 s (`NOTIFICATIONS_INTERVAL_MS`,
  `0` disables it), with backoff 1/5/15/60/180 min and `NOTIFICATIONS_MAX_ATTEMPTS`
  (default 5). Claiming uses a `lockedUntil` lease, so multiple API replicas do
  not double-send. Delivered messages older than 30 days are pruned hourly.
- Email: SMTP via `nodemailer` when `MAIL_HOST` is set, otherwise the **file**
  transport writes `.eml` files to `uploads/mail` (openable in any mail client).
- SMS: Kavenegar REST when `KAVENEGAR_API_KEY` is set, otherwise the server log
  with an explicit `[sms:log]` prefix (never pretending to be delivered).
- Templates (Persian, HTML + text): `order.placed`, `payment.paid`,
  `order.shipped`, `auth.welcome`, `test.send`.
- Hooks: checkout → order.placed; payment success → payment.paid; the
  `→ SHIPPED` edge only → order.shipped; registration → welcome.
  A mail failure can never roll back an order or a payment.
- Channel switches: `notifications.email` / `notifications.sms` store settings
  (admin → تنظیمات).

Admin panel: `/notifications` (queue, filters, stats, retry/cancel, "process
queue", test send, live transport status), `/payments` (transactions with
provider/status/ref id, summary by status, active gateway card).

## 3. Rate limiting and production logging

- `RateLimitGuard` now counts in `RateLimitCounter` (composite `(key, windowStart)`
  PK, single atomic upsert) instead of a process-local `Map`, so limits survive
  restarts and hold across replicas. If the DB write fails it degrades to the
  old in-memory map instead of failing the request. Responses carry
  `x-ratelimit-limit/remaining/reset`; a breach returns `429 RATE_LIMITED` with
  `retry-after` and `retryAfterSeconds`.
- New limited routes: checkout, payment initiate/retry/sandbox-complete.
- `JsonLogger`: one JSON object per line (`time, level, service, context, message`
  + fields), `LOG_LEVEL` filter, `LOG_FORMAT=pretty` for local reading, automatic
  redaction of anything matching password/token/secret/authorization/cookie/otp.
- `requestContext` middleware: accepts/creates `x-request-id`, echoes it, logs
  `http.request` with method/path/status/duration/ip/userId, warns on
  `http.slow_request` above `SLOW_REQUEST_MS`.
- `AllExceptionsFilter`: JSON error bodies include `requestId`; 5xx log the stack,
  4xx stay at debug; stacks never reach the client.

## Verification performed

```
checkout                       201  order AWAITING_PAYMENT + SBX authority
sandbox session                200  amount/order/items/merchant
sandbox complete success       201  order PAID, payment refId, idempotent replay
sandbox complete cancel        201  order CANCELLED, payment FAILED, stock restored
payments/status/:number        200  public state incl. provider/refId
admin notifications            total 4 → SENT (2 email .eml + 2 [sms:log])
order.shipped via shipment     201  email + SMS queued and delivered
SMTP forced to a dead port     notification attempt fails, lastError recorded
retry after fixing transport   SENT on first retry
Zarinpal without merchant      503 PAYMENT_GATEWAY_ERROR (+ REQUEST_ERROR event)
21st request to a 20/min route 429 + x-ratelimit headers
```

`pnpm --filter @ecom/api typecheck|build`, `@ecom/web build`, `@ecom/admin build`
and both `typecheck` scripts are green.

## Configuration

See `.env.example` (payments, mail, SMS, logging blocks) and
`docs/commands.md` for the operational commands. The quickest local setup needs
no external accounts: sandbox gateway + file mail + log SMS.
