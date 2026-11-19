# Sprint 16 — Storefront phase 2: faceted filters, compare, recently viewed, gift options

Everything below is DB-backed and wired to the real API/storefront components — no mock data, no dead buttons.
One schema change was required (gift columns), so `pnpm db:setup` (or `pnpm db:migrate`) must run after pulling.

## 1. Advanced catalog filters (colour / size / brand / price)

The filter sidebar used to only offer category, four hard-coded price buckets and an in-stock chip.
It now renders **real facets computed from the catalogue**, and every filter is a server-side query.

**API**

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/api/catalog/products?color=…&size=…&brand=…` | `color` / `size` accept comma-separated attribute-value slugs, `brand` a comma-separated brand list |
| GET | `/api/catalog/facets?q=&category=&minPrice=&maxPrice=&inStock=&brand=` | returns `colors[]` (slug/value/hex/count), `sizes[]`, `brands[]` and `priceRange` |

- `ProductsService.buildWhere()` is now a single source of truth shared by the listing and the facets, so
  facet counts always describe the same result set as the grid.
- **Bug fixed:** the old `where` object set `OR` twice (search terms and in-stock), so any
  `?q=…&inStock=true` request silently dropped the search. Filters are now composed inside an `AND[]` array.
- Colour and size are matched **on the same variant** (`variants.some AND[…])`), so “cream + M” cannot match
  a product that only has cream in L.
- Colour swatches read their hex from `AttributeValue.meta.hex`; the seed now stores realistic Pantone-ish
  hexes per colour name instead of generated greys.

**Storefront** — `apps/web/src/components/catalog-view.tsx`

- Colour swatch grid (selected = ring + label), size chips, brand chips with counts.
- Numeric min/max price inputs (`catalog-filters.tsx`, client component that preserves other filters) instead
  of the fixed buckets.
- Removable active-filter chips above the grid (`رنگ: کرم ×`, `سایز: M ×`, `۱٬۰۰۰٬۰۰۰ تا ۹٬۰۰۰٬۰۰۰ ×`, …).
- Mobile: the same panel collapses into a native `<details>` “فیلترها” drawer — no JS needed to open it.

**Seed** — because colours were never attached to products, `packages/db/prisma/seed.ts` now links each
product’s `color` to all of its variants (`VariantAttributeValue`) and backfills that link for catalogues
seeded before Sprint 16 (idempotent, safe to re-run: `pnpm db:seed`).

## 2. Product compare (up to 3)

- `apps/web/src/components/compare-store.tsx` — `localStorage` store (`compare_products`, max 3) with a
  cross-tab `storage` listener; `useCompare()`, `CompareButton`, `CompareBar`.
- `CompareButton` sits on every product card and toggles the product; it disables itself at 3 items with a
  tooltip explaining the limit.
- `CompareBar` (mounted in the root layout) appears on any page once something is selected: thumbnails,
  per-item remove, clear, and a CTA to the compare page.
- `/compare` (`apps/web/src/app/compare/page.tsx`) fetches each selected product from the API and renders a
  comparison table: image, price (with discount), brand, stock, colours, sizes, short description and a
  quick-add button. Empty state explains how to add products; the header has a compare icon with a counter.

## 3. Recently viewed

- `apps/web/src/components/recently-viewed.tsx` — `TrackRecentlyViewed` records the visited product
  (id/slug/name/brand/image/price, newest first, max 8) into `localStorage`; the product page mounts it.
- `RecentlyViewedRail` renders the history (excluding the current product) as a snap-scroll rail under the
  “پیشنهاد هم‌استایل” block on the product page. Nothing renders when there is no history, so first-time
  visitors never see an empty shell.

## 4. Gift wrap + gift note (cart → order)

New columns: `Cart.giftWrap`, `Cart.giftNote`, `Order.giftWrap`, `Order.giftNote` (both models, default `false` / `null`).

**API**

| Method | Route | Notes |
| --- | --- | --- |
| PATCH | `/api/cart/gift` | body `{ giftWrap: boolean, giftNote?: string }`, works for guests (`guestToken`) and logged-in users |

- The note is trimmed and capped at 240 characters; turning wrap off clears the note.
- `POST /api/checkout` copies both fields onto the created order inside the same transaction.

**UI**

- Cart (`apps/web/src/app/cart/page.tsx`): a gift card with a toggle, note textarea + character counter,
  save button and inline status message; the summary shows «بسته‌بندی هدیه — رایگان».
- Checkout: shows a confirmation block with the gift note and a link back to the cart to edit it.
- Account order page: a dedicated gift section with the handwritten note.
- Admin order page: rows for «بسته‌بندی هدیه» and «متن کارت هدیه».

Gift packaging is free (a brand promise), so no pricing/ledger changes were needed.

## Verification

```bash
pnpm install && pnpm db:generate && pnpm --filter @ecom/db build
pnpm db:local      # terminal 1
pnpm db:setup      # adds the four gift columns
pnpm db:seed       # attaches colour attributes + backfills existing catalogues
pnpm dev           # terminal 2
```

- `curl '/api/catalog/facets?brand=AGHACI'` → 5 colours / 8 sizes / brand count.
- `curl '/api/catalog/products?color=color-3&size=size-m&brand=AGHACI'` → the cream coat only.
- `curl '/api/catalog/products?q=پالتو&inStock=true'` → search is no longer dropped by the in-stock filter.
- `PATCH /api/cart/gift` → `GET /api/cart` echoes `giftWrap/giftNote`; `POST /api/checkout` returns an order
  carrying the same gift fields (checked end to end, order `AG-MWO78EBA`).
- `pnpm --filter @ecom/api typecheck`, `pnpm --filter @ecom/web typecheck`, `pnpm --filter @ecom/admin typecheck` all pass.
