# Sprint 2 Report — Catalog Foundation

## Status
Code-complete in source. **Verification blocked** in this environment: dependencies cannot be installed (`pnpm install` failed earlier due registry/network), so Prisma migration/generate, typecheck, build, and runtime tests were not executed here.

## Implemented
- **Prisma**: `Category` (self tree, SEO, image/banner, sort/active), `Product` (simple/variable enum, status lifecycle, pricing/inventory base, schedule/publish), `ProductCategory`, `ProductImage`, `ProductSeo`.
- **Seed**: added `catalog:read`/`catalog:write`; bootstrap marker updated to sprint 2.
- **Admin APIs** (JWT + RBAC):
  - `GET/POST/PATCH/DELETE /api/admin/categories` (`catalog:read|write`)
  - `GET/POST/PATCH/DELETE /api/admin/products` (`catalog:read|write`)
  - Product create/update supports category links, images, SEO upsert; audit logging included.
- **Public catalog APIs** (`@Public`):
  - `GET /api/catalog/categories` (active tree)
  - `GET /api/catalog/categories/:slug`
  - `GET /api/catalog/products` (published only, pagination, `q`, `category` slug filter)
  - `GET /api/catalog/products/:slug` (published)

## Local verification
```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @ecom/db prisma:generate
pnpm --filter @ecom/db exec prisma migrate dev --name sprint2_catalog_foundation
pnpm --filter @ecom/db prisma:seed
pnpm --filter @ecom/api typecheck
pnpm --filter @ecom/api build
pnpm dev
```

## Notes / next
- Sprint 2 delivers catalog foundation (simple product base + category tree + public read). Variants/attributes/advanced storefront filters are **Sprint 3**.
- CMS/Page Builder remains DB-backed and scheduled for **Sprint 4+** (no fake UI/data substitution).
- Before production hardening: add slug uniqueness conflict handling responses, soft-delete/archive policies, full DTO coverage for all status transitions, and automated tests.
