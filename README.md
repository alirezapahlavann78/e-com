# E-Commerce Aghaci

Monorepo for a production-oriented fashion e-commerce platform (storefront + admin + API).

## Stack
- `apps/web`: Next.js App Router storefront (catalog, CMS renderer, cart/checkout, account/orders, reviews/wishlist hooks)
- `apps/admin`: Next.js App Router admin shell + CMS pages
- `apps/api`: NestJS REST API, Swagger, JWT+refresh, RBAC, audit, rate-limit guard
- `packages/db`: Prisma schema/client/seed (PostgreSQL)
- `packages/*`: shared types/validation/utils/ui/config
- `infra/docker-compose.yml`: PostgreSQL + MinIO (S3-compatible)

## Prerequisites
- Node.js >= 20
- pnpm >= 10
- Docker Desktop (for local Postgres/MinIO)

## Local setup
1. Copy `.env.example` to `.env` and adjust secrets/URLs if needed.
2. Start infrastructure:
   ```powershell
   docker compose -f infra/docker-compose.yml up -d
   ```
3. Install dependencies:
   ```powershell
   pnpm install
   ```
4. Generate Prisma client and apply migrations sequentially (DB must be up). Use the sprint migration names in `docs/sprint-*.md` (`sprint1_*` through latest), then seed:
   ```powershell
   pnpm --filter @ecom/db prisma:generate
   pnpm --filter @ecom/db exec prisma migrate dev --name <sprint_migration>
   pnpm --filter @ecom/db prisma:seed
   ```
5. Run apps:
   ```powershell
   pnpm dev
   ```

## URLs
- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs
- MinIO console: http://localhost:9001

## Implemented sprint foundations (see `docs/`)
- Sprint 0 foundation; Sprint 1 auth/RBAC/core; Sprint 2 catalog; Sprint 3 variants/attributes/storefront catalog; Sprint 4 DB-backed CMS/Page Builder rendered by storefront; Sprint 5 templates/redirects; Sprint 6 cart/checkout/sandbox payment; Sprint 7 inventory/anti-oversell; Sprint 8 orders/returns/invoices; Sprint 9 pricing/promotions/discounts + CRM/marketing schema foundation; Sprint 10 CRM/reviews/wishlist/marketing read foundations; Sprint 11 auth hardening (lockout, email verification tokens, rate limiting) + marketing ops foundations.

## Verification status
Automated install/migrate/typecheck/build/runtime verification is blocked in environments where `pnpm install` cannot reach the registry. Run the local setup steps above when deps/network are available; treat migrations, seed, typecheck, and runtime smoke checks as required before production use.
