# Sprint 3 Report — Variants, Attributes & Storefront Catalog

## Status
Code-complete in source. **Verification blocked** by missing installed dependencies/lockfile in this environment (same registry/network blocker), so Prisma migration/generate, TypeScript/build, and runtime API/storefront tests were not executed here.

## Implemented
- **Prisma**: `Attribute`, `AttributeValue`, `ProductVariant`, `VariantAttributeValue`, `ProductRelation` + `ProductRelationType`; product relations to variants/related products. Seed adds base color/size attributes and sprint 3 marker.
- **Admin APIs** (JWT+RBAC `catalog:*` + audit): `GET/POST/PATCH/DELETE /api/admin/attributes` (with values). Product admin create/update now supports `variants[]` (SKU/barcode/price/stock/active/image/attributeValueIds) and `relations[]` (RELATED/COMPLEMENTARY) in transactional replacement.
- **Public catalog** (`@Public`): product listing supports `page/limit/q/category/sort/minPrice/maxPrice/inStock`; `GET /api/catalog/search/autocomplete?q=` returns matching products/categories. Product detail includes variants with attribute values and related products.
- **Storefront (apps/web)**: `/products` listing with server-side fetch + filters/sort UI, `/products/[slug]` detail showing variants/related links. Uses real API (`NEXT_PUBLIC_API_URL`), no mock data.

## Local verification
```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @ecom/db prisma:generate
pnpm --filter @ecom/db exec prisma migrate dev --name sprint3_variants_attributes
pnpm --filter @ecom/db prisma:seed
pnpm --filter @ecom/api typecheck
pnpm --filter @ecom/api build
pnpm --filter @ecom/web typecheck
pnpm --filter @ecom/web build
pnpm dev
```

## Notes
- Admin UI pages/forms are not yet built; APIs are ready for admin UI work. Storefront has real catalog pages but advanced UX (galleries, compare, reviews, cart) remains for later sprints per roadmap.
- CMS/Page Builder remains **Sprint 4+**, DB-backed and storefront-rendered (no fake UI).