# Sprint 6 Report — Cart, Checkout & Payment Architecture

## Status
Code-complete foundation in source. **Verification blocked** by missing installed dependencies/lockfile in this environment (registry/network blocker), so Prisma migration/generate, TypeScript/build, and runtime tests were not executed here.

## Implemented
- **Prisma**: `Cart`, `CartItem`, `CustomerAddress`, `DiscountCode` (base), `Order` (status/payment snapshots), `OrderItem` (price/name/SKU/variant snapshot), `Payment`; enums `OrderStatus`, `PaymentStatus`, `PaymentProvider`. Relations added to `User`, `Product`, `ProductVariant`. Seed marker sprint 6.
- **Cart API** (`/api/cart`, public with optional auth): guest token or user cart; get/add/update/remove items; price captured from published product/variant at add time; summary totals returned.
- **Checkout API** (`/api/checkout`, public): creates order in Prisma transaction from cart items, validates stock for tracked items, snapshots order items, decrements stock, clears cart, creates sandbox payment intent. `GET /api/checkout/sandbox/verify?reference=` verifies sandbox payment and updates order/payment status.
- **Payment architecture**: `PaymentAdapter` interface + `SandboxPaymentAdapter` (intent/verify). Provider field stored; real gateways (Stripe/Zarinpal/etc.) can be added behind same interface.
- **Storefront**: header links, `/products/[slug]` add-to-cart button (guest token), `/cart` page, `/checkout` page, `/checkout/sandbox` verification page. Uses real APIs.

## Deferred (roadmap/hardening)
- Auth cart merge on login, address CRUD UI/API, discount/gift validation rules, shipping/tax calculators, idempotency keys, webhook verification, payment retries/refunds, order history UI, robust stock reservation/expiry (Sprint 7 deepening), full anti-race hardening and tests.

## Local verification
```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @ecom/db prisma:generate
pnpm --filter @ecom/db exec prisma migrate dev --name sprint6_cart_checkout_payment
pnpm --filter @ecom/db prisma:seed
pnpm -r typecheck
pnpm dev
```