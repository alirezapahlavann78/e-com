# Sprint 5 Report — Dynamic Templates & URL/Redirects

## Status
Code-complete foundation in source. **Verification blocked** by missing installed dependencies/lockfile in this environment (same registry/network blocker), so Prisma migration/generate, TypeScript/build, and runtime tests were not executed here.

## Implemented
- **Redirects**: `RedirectsModule/Service/Controller`. Public `GET /api/redirects/resolve?path=`; admin `GET/POST /api/admin/redirects` (RBAC `cms:*` + audit). Slug changes now create/update redirects in DB transactions for `Product` (`/products/{old}`), `Category` (`/categories/{old}`), and `Page` (`/pages/{old}` where applicable).
- **Dynamic template resolution**: public `GET /api/cms/resolve/:kind/:slug` resolves `page|category|product|brand` and returns entity + optional CMS template (`category-template`, `product-template`, `brand-{slug}`/`brand-template`, or matching page) using real DB data.
- **Storefront routes**: `/products/[slug]` remains real product detail (with redirect lookup on old slug path behavior in service); `/categories/[slug]` renders live category + products + optional CMS template sections; `/brands/[slug]` renders dynamic brand page with optional CMS template; `/[slug]` renders published CMS custom/static pages and checks redirect resolution before 404. Home remains DB-backed CMS.
- **Data integrity**: public product reads follow active redirect target when old slug is requested.

## Deferred (roadmap/hardening)
- HTTP 301 redirects at storefront for every entity route (currently product API resolves target; CMS slug route redirects via Next). Add universal resolver middleware/route.
- Full visual template editors for product/category/brand in admin UI, slug-change preview UX, redirect management UI table, scheduled publish worker.
- Broader automated tests and conflict/error UX for duplicate slugs.

## Local verification
```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @ecom/db prisma:generate
pnpm --filter @ecom/db exec prisma migrate dev --name sprint5_dynamic_templates_redirects
pnpm --filter @ecom/db prisma:seed
pnpm --filter @ecom/api typecheck
pnpm --filter @ecom/web typecheck
pnpm --filter @ecom/admin typecheck
pnpm dev
```