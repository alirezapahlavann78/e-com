# Sprint 11 — Security Hardening & Ops Foundations

## Delivered
- **Auth hardening (`apps/api/src/auth/*`, Prisma)**
  - `User` fields: `failedLoginAttempts`, `lockoutUntil`. Login tracks failures, locks account after configurable attempts (`AUTH_LOCKOUT_MAX_ATTEMPTS`, default 5) for `AUTH_LOCKOUT_MINUTES` (default 15); successful login resets counters. Audits `auth.login.failed`/`auth.lockout`.
  - Email verification: `EmailVerificationToken` model, token issuance on register, `POST /api/auth/verify-email`, authenticated `POST /api/auth/request-email-verification`. Non-production responses include `devToken` for local testing (no mail transport wired).
  - Existing refresh rotation/revocation behavior preserved.
- **Rate limiting (`apps/api/src/common/*`, `app.module.ts`)**
  - Global `RateLimitGuard` + `@RateLimit(limit, windowMs)` decorator (in-memory buckets keyed by IP+method+route). Applied to auth sensitive endpoints (register/login/refresh/verify/logout/request verification).
  - Production note: in-memory limiter is single-process only; use Redis/shared store behind load balancers.
- **Marketing operations foundations (`apps/api/src/crm/marketing.controller.ts`)**
  - Added admin write endpoints (`crm:write`, audited): create/update campaigns, create/update gift cards, snapshot abandoned cart by cart ID (`POST /api/marketing/abandoned-carts/snapshot/:cartId`), list abandoned carts with optional status filter.
- **DB/Seed**
  - `packages/db/prisma/schema.prisma`: auth hardening + `EmailVerificationToken`; `packages/db/prisma/seed.ts` bootstrap marker/audit `sprint-11`.

## Verification (blocked by environment)
- `pnpm install` failed previously (`registry.npmmirror.com` socket/fetch). `node_modules`/`pnpm-lock.yaml` absent; Prisma generate/migrate/seed, typecheck, build, runtime, and full lint/tests could not run.
- When deps/network are available:
  1. `pnpm install`
  2. `docker compose -f infra/docker-compose.yml up -d`
  3. `pnpm --filter @ecom/db prisma:generate`
  4. Apply migrations sequentially (`sprint1_*` … prior sprints) and create/apply `sprint11_auth_hardening_marketing_ops` (or equivalent) for new schema changes.
  5. `pnpm --filter @ecom/db prisma:seed`
  6. `pnpm -r typecheck && pnpm build`
  7. Smoke: failed-login lockout, email verify flow, rate-limit 429, campaign/gift-card CRUD, abandoned-cart snapshot.

## Deferred / not claimed complete
- Email delivery (SMTP/provider), password reset flow, MFA, session management UI.
- Distributed rate limiting/abuse detection, CAPTCHA, CSRF strategy if cookie auth adopted.
- Comprehensive unit/integration/e2e tests and CI quality gates (lint/typecheck/test/build) — cannot be fully verified until deps are installable.
- Full admin UI for CRM/marketing hardening ops; automated abandoned-cart jobs/notifications; gift-card redemption/ledger; campaign sending pipeline.
