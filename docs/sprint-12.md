# Sprint 12 — Storefront Redesign & Visual Page Builder

## Delivered

### Design system (`apps/web/src/app/globals.css`, `layout.tsx`)
- Warm editorial palette (linen / ink / terracotta), RTL-first typography with self-hosted **Vazirmatn Variable**, utility layer (`.shell .section .btn .card .field .chip .badge .eyebrow .display-xl .display-lg .lead .link-underline .product-media`).
- Cinematic media set in `apps/web/public/media/{hero,categories,products}` (real photography, mirrored to the admin app for the builder preview).

### Storefront screens (limited, intentional set)
- **Home** (`app/page.tsx`): DB-driven from `/cms/home`, falls back to a hero + newest grid; sections rendered by `components/cms/PageRenderer.tsx` (hero, image slider, category cards, product grids/carousels, promo banner, countdown, testimonials, FAQ, newsletter).
- **Catalog** (`components/catalog-view.tsx`, `catalog-toolbar.tsx`, `/products`, `/categories/[slug]`): category tree, price ranges, in-stock filter, sort toolbar (client → `router.push`), 3-column grid, pagination, empty state; category template sections from `/cms/resolve/category/:slug` when present.
- **Product** (`/products/[slug]`, `product-purchase.tsx`, `reviews-wishlist.tsx`): gallery + thumbnails, sale badge, compare-at price, live stock, size picker disabling sold-out variants, quantity stepper, add-to-cart, wishlist, trust strip, native `<details>` description/specs/shipping, rating distribution + review submission (moderated → `PENDING`), related products.
- **Cart** (`/cart`): line items with quantity control, order summary (subtotal, discount, shipping, free-shipping progress), discount apply/remove, checkout CTA, empty state.
- **Checkout** (`/checkout`): contact, address (province list), standard/express shipping, sandbox payment note, sticky summary, guest checkout via `guestToken` in the request body, success screen linking to the payment redirect.
- **Account** (`/account`): login/register tabs (`/auth/login`, `/auth/register`), orders list with status badges, wishlist grid with removal, profile panel; `/account/orders/[id]` order detail with status timeline and return request.
- **CMS pages** (`/[slug]`, `/pages/[slug]` alias): any published CMS page renders through `PageRenderer`; legacy `/pages/*` URLs 301 to their canonical path.

### Same-origin API access
- Both Next apps rewrite `/api/:path*` → `API_INTERNAL_URL` (`http://127.0.0.1:4000/api`) and use `NEXT_PUBLIC_API_URL=/api`, so the browser never needs a private host/port. Server components resolve through `API_INTERNAL_URL`, client components use the relative path.

### Commerce completeness
- `CartService.shippingQuote()` reads `shipping.freeThreshold` / `shipping.standardRate` from `StoreSetting`; cart summary now returns `shippingAmount`, `taxAmount`, `freeShippingRemaining`.
- `CheckoutService.createOrder()` accepts `shippingMethod` (`standard` | `express`, express rate from `shipping.expressRate`) and `customerNote`, persisting the method inside `shippingAddress`.

## Verified
- `tsc --noEmit` clean for `apps/web`.
- Guest flow end-to-end: `POST /cart/items` → cart summary (subtotal, shipping, free-shipping threshold) → `POST /checkout` (express + note persisted) → `GET /checkout/sandbox/verify` → payment `PAID`.
- Every storefront route returns 200 with real CMS/catalog content: `/`, `/products`, `/products/:slug`, `/categories/:slug`, `/cart`, `/checkout`, `/account`, `/about`, `/:slug`.
