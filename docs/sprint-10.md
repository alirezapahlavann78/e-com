# Sprint 10 — CRM, Reviews, Marketing (Foundation)

## Delivered
- API modules wired in `apps/api/src/app.module.ts`: `CrmModule`, `ReviewsModule`, `WishlistModule`.
- **CRM (`apps/api/src/crm/*`, RBAC `crm:read|write`, audited mutations):**
  - Admin: `GET /api/crm/customers`, `GET /api/crm/customers/:id` (includes LTV summary from paid orders), `PATCH /api/crm/customers/:id/profile`, `POST /api/crm/customers/:id/notes`.
  - Segments: list/create + assign/remove member (`/api/crm/segments*`).
  - Tags: list/create + assign/remove (`/api/crm/tags*`).
  - Customer self: `GET /api/my/profile` (ensures `CustomerProfile`).
  - Marketing admin read foundations (`crm:read`): campaigns, campaign detail, gift cards, abandoned cart snapshots (`/api/marketing/*`).
- **Reviews (`apps/api/src/reviews/*`):**
  - Public: `GET/POST /api/reviews/product/:slug` (submit creates `PENDING`, verified when authenticated user present).
  - Admin moderation: `GET /api/admin/reviews`, `PATCH /api/admin/reviews/:id/moderate` (`crm:read|write`, audited).
- **Wishlist (`apps/api/src/wishlist/*`, authenticated):** `GET/POST/DELETE /api/my/wishlist*` with customer activity hooks.
- Uses Sprint 9 schema foundation (`Customer*`, `ProductReview`, `WishlistItem`, `Campaign*`, `GiftCard`, `AbandonedCartSnapshot`) and existing `crm:*` permissions.

## Storefront
- `apps/web/src/app/products/[slug]/reviews-wishlist.tsx` + wired into product detail: approved review list/summary, review submission form (pending moderation), wishlist add button (requires `accessToken`).

## Verification (blocked by environment)
- `pnpm install` previously failed (`registry.npmmirror.com` socket/fetch). `node_modules`/`pnpm-lock.yaml` absent; Prisma generate/migrate/seed, typecheck, build, runtime, and full lint/tests could not run.
- Sprint 10 is additive on Sprint 9 schema/permissions; when deps/network are available run Sprint 9 migration/seed if not applied, then typecheck/build/smoke.

## Deferred / follow-up
- Full admin CRM/marketing UI pages and richer customer account UI.
- Campaign execution/sending, loyalty program logic, gift-card redemption flow, abandoned-cart detection/automation jobs.
- Review helpfulness/reporting, verified-purchase enforcement rules, and anti-spam controls.
- Customer merge/deletion/privacy workflows and advanced segmentation rules engine.
