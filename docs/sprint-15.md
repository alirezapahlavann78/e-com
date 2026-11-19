# Sprint 15 — Media library, users & roles, reports + CSV, invoice printing

All four deliverables are DB-backed and wired to the real API (no mock data, no dead buttons).
Permissions reuse existing keys (`media:*`, `users:*`, `orders:read`, `settings:read`), so no re-seed is required.

## 1. Media library (admin → «کتابخانه رسانه»)

**API** — `apps/api/src/media/media.controller.ts`

| Method | Route | Permission | Purpose |
| --- | --- | --- | --- |
| GET | `/api/admin/media?folder=&q=&take=` | `media:read` | list + search (key/alt/folder/tag) |
| GET | `/api/admin/media/folders` | `media:read` | distinct folders for the filter chips |
| POST | `/api/admin/media/upload` | `media:write` | stores a base64 payload on disk, records a `MediaAsset` |
| POST | `/api/admin/media/assets` | `media:write` | register an external URL (S3/MinIO later) |
| PATCH | `/api/admin/media/:id` | `media:write` | alt / folder / tags |
| DELETE | `/api/admin/media/:id` | `media:write` | removes the row **and** the file |
| GET | `/api/admin/media/:id/file` | `media:read` | redirects to the stored URL |

- Files go to `apps/api/uploads/<folder>/<timestamp>-<name>-<rand>.<ext>` and are served at `/uploads/...`
  (`main.ts` → `useStaticAssets`, 12 MB JSON body limit for the base64 payload).
- Accepted: images, `application/pdf`, `video/mp4`. Max 8 MB per file.
- Both Next apps proxy `/uploads/:path*` to the API, so media URLs work on localhost and in hosted previews.
- Swapping to S3/MinIO later only changes `MediaController.upload`.

**UI** — `apps/admin/src/app/media/page.tsx`: drag & drop or click upload (multi-select), thumbnails,
search, folder filter, copy URL, edit alt/folder, delete with confirm, preview modal, size/date metadata.

**Image picker** — `apps/admin/src/components/media-picker.tsx` (modal, search + inline upload) is wired into the
page builder image field (`/cms/pages/[id]`), so any block image can come from the library.

## 2. Users & roles (admin → «کاربران و نقش‌ها»)

**API** — existing `apps/api/src/users` + `apps/api/src/rbac`: `GET /admin/users`, `GET /admin/users/:id`,
`POST /admin/users`, `PATCH /admin/users/:id` (status, `isAdmin`, `roleIds`), `GET /admin/rbac/roles`.

**UI** — `apps/admin/src/app/users/page.tsx`: paginated table (name, email, roles, status, last login, joined),
client-side search, quick suspend/activate, role & status editor, create-user modal, lock indicator
(`lockoutUntil`) with the `pnpm user:unlock` hint.

## 3. Reports + CSV (admin → «گزارش‌ها»)

**API** — `apps/api/src/reports` (guarded by `orders:read`):

- `GET /api/admin/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD` → totals (revenue, paid orders, AOV, refunds,
  new customers, shipping, discount, tax, shipped, cancelled), day buckets, status/payment breakdown,
  top products, top customers.
- `GET /api/admin/reports/export?dataset=orders|products|customers|inventory&from=&to=` → `text/csv`
  with `Content-Disposition` and a UTF-8 BOM so Excel shows Persian correctly.

**UI** — `apps/admin/src/app/reports/page.tsx`: date range + 7/30/90-day presets, KPI cards, daily revenue bars,
status/payment breakdown, top products/customers tables, four CSV download buttons (fetch + blob, bearer token).

## 4. Invoice printing (admin → سفارش → «چاپ فاکتور»)

- `GET /api/admin/orders/:id/invoice-data` (`orders:read`) returns the order (items, user, shipments), the newest
  invoice — created on demand — and the `store.*` settings for the letterhead.
- `apps/admin/src/app/orders/[id]/invoice/page.tsx` renders an A4 RTL invoice (brand block, buyer + shipping
  address, item table, totals, footer) with a dedicated `@media print` stylesheet and a print/PDF button.
  The order page now links to it from the invoice card.

## Verification performed

```
pnpm --filter @ecom/api typecheck     ✔
pnpm --filter @ecom/admin typecheck   ✔
pnpm --filter @ecom/web typecheck     ✔
pnpm db:reset && pnpm db:seed         ✔ (265 statements, 12 products, 6 orders, 4 pages)

POST /admin/media/upload              → 201, url /uploads/products/…
GET  /uploads/products/…              → 200 image/png (direct and through the Next rewrite)
GET  /admin/media?q=shirt             → 1 hit · GET /admin/media/folders → ["products"]
PATCH /admin/media/:id {alt}          → 200 (Persian alt stored)
DELETE /admin/media/:id               → {ok:true}, file → 404 afterwards
GET  /admin/reports/sales?…           → revenue 41,710,000 · 19 day buckets
GET  /admin/reports/export?dataset=orders → text/csv, BOM, filename orders-….csv
GET  /admin/orders/:id/invoice-data   → invoice INV-…, 2 items, store settings, shipping address
POST /admin/users                     → 201 · PATCH roles+status → 200 · GET list → total 5
Admin pages /media, /reports, /users, /orders/<id>/invoice, /cms/pages/<id> → HTTP 200
```

## Notes / limits

- Local disk storage is intentional for the single-node dev/prod setup; there is no CDN or image
  transformation pipeline. Files are gitignored (`apps/api/uploads/`).
- Conversion rate is not reported (no analytics events yet) — the report states that explicitly.
- Role editing requires at least one role row to exist; the seed creates the `admin` role.
