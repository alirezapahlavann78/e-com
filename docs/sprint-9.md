# Sprint 9 — Pricing, Promotions & Discounts Engine (Foundation)

## Delivered (additive foundation)
- Extended Prisma for pricing/promotions and Sprint 9 CRM/marketing foundation:
  - `DiscountType` enum; `DiscountCode` upgraded (`campaignId`, `segmentId`, typed `type`), `Cart.discountCodeId`, `Order.discountRedemptions`.
  - `DiscountRedemption` records discount usage per order.
  - Foundation models for roadmap continuity: `CustomerProfile`, `CustomerSegment/Member`, `CustomerTag/Assignment`, `CustomerNote`, `CustomerActivity`, `ProductReview`, `WishlistItem`, `Campaign/CampaignProduct/CampaignRecipient`, `GiftCard` (base), `AbandonedCartSnapshot`.
  - Order field rename: `Order.customerNote` (text note) to avoid collision with `Order.notes` relation (`OrderNote[]`).
- Seed updated to Sprint 9 marker/audit and new permissions: `crm:read`, `crm:write` (plus existing catalog/orders permissions used by admin discount APIs).

## API
- `DiscountsModule` (`apps/api/src/discounts/*`): admin CRUD `GET/POST/PATCH/DELETE /api/discounts` (`catalog:read|write`, audited).
- Public validation: `POST /api/promotions/validate` (code + subtotal) returns resolved discount/free-shipping.
- Cart: `POST /api/cart/discount`, `DELETE /api/cart/discount`; cart summary now resolves active discount and returns `subtotal/discountAmount/total/freeShipping/discountError`.
- Checkout: applies cart/request discount code, snapshots `discountAmount`/`discountCodeId`, creates `DiscountRedemption`, increments `DiscountCode.usedCount`, clears cart discount. Sandbox verify on non-PAID decrements `usedCount` (guarded) while releasing stock.

## Storefront
- `apps/web/src/app/cart/page.tsx`: discount code apply/remove UI and subtotal/discount/total display.

## Verification (blocked by environment)
- `pnpm install` failed in earlier attempts (`registry.npmmirror.com` socket/fetch errors, slow tarballs). `node_modules`/`pnpm-lock.yaml` absent; Prisma generate/migrate/seed, typecheck, build, runtime, and full lint/tests could not run.
- When deps/network are available, run migration name `sprint9_pricing_promotions_crm_foundation` (or equivalent), then seed/typecheck/build/smoke.

## Deferred / follow-up
- Full admin CRM UI + customer CRM APIs (profiles/segments/tags/notes/activity/LTV detail views).
- Product reviews moderation workflow and storefront review submission UI (schema/API foundation added).
- Wishlist API/UI, campaigns execution, loyalty program, gift-card redemption flow, abandoned-cart automation jobs.
- Advanced promotion rules (product/category/brand targeting, stacking priority, coupons per-customer limits, schedule-aware catalog pricing).
