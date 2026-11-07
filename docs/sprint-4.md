# Sprint 4 Report — CMS / Page Builder Core

## Status
Code-complete foundation in source. **Verification blocked** by missing installed dependencies/lockfile in this environment (same registry/network blocker as prior sprints), so Prisma migration/generate, TypeScript/build, and runtime API/admin/web tests were not executed here.

## Implemented (DB-backed, not fake UI)
- **Prisma**: `Page`, `PageVersion`, `PageSection` (JSON config, type, order, visibility), `GlobalLayout`, `NavigationMenu`/`NavigationItem`, `MediaAsset`, `Redirect`; enums `PageStatus`, `PageType`, `RedirectType`. Seed creates `cms:*`/`media:*` permissions and a published `home` page with hero + product grid sections, default layout/menu.
- **Admin API** (JWT+RBAC `cms:*` + audit): `GET/POST/PATCH/DELETE /api/admin/cms/pages`, `POST /api/admin/cms/pages/:id/publish`, layout/menu endpoints. Page updates create new draft versions and persist section configs in DB.
- **Public CMS API** (`@Public`): `GET /api/cms/home`, `GET /api/cms/pages/:slug`, `GET /api/cms/layout` — resolves published version + visible sections from DB.
- **Media API foundation** (JWT+RBAC `media:*`): list assets, create asset record, upload intent endpoint (S3 presign adapter pending runtime/deps).
- **Storefront** (`apps/web`): Home renders from `/cms/home`; dynamic route `/[slug]` resolves `/cms/pages/:slug`; `PageRenderer` renders DB sections via registry (`hero`, `product_grid/new_arrivals/best_sellers`, `rich_text`, generic fallback showing stored config). No mock CMS data.
- **Admin UI** (`apps/admin`): `/login`, `/cms/pages` list/create (draft + optional hero section saved to DB), `/cms/pages/[id]` add section (new draft version) and publish. Uses real API with stored access token.

## Gaps intentionally deferred (roadmap)
- Drag-and-drop visual editor, responsive preview modes, full section library UX, duplicate/archive, scheduled publish worker, redirect auto-generation on slug changes, menu/layout editors, S3 presigned upload wiring, template binding for product/category/brand pages (**Sprint 5+** per plan).

## Local verification
```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @ecom/db prisma:generate
pnpm --filter @ecom/db exec prisma migrate dev --name sprint4_cms_core
pnpm --filter @ecom/db prisma:seed
pnpm --filter @ecom/api typecheck
pnpm --filter @ecom/api build
pnpm --filter @ecom/web typecheck
pnpm --filter @ecom/admin typecheck
pnpm dev
```
Then login at `http://localhost:3001/login` (bootstrap admin), create/publish a page in `/cms/pages`, and verify it renders at `http://localhost:3000/<slug>`. Home should render DB-backed CMS sections.