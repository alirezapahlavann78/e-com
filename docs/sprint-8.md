# Sprint 8 Report — Orders, Returns, Invoices

## Status
Code-complete foundation in source. **Verification blocked** by missing installed dependencies/lockfile in this environment (registry/network blocker), so Prisma migration/generate, TypeScript/build, and runtime tests were not executed here.

## Implemented
- **Prisma**: `OrderStatusHistory`, `OrderNote`, `Shipment`, `Invoice`, `ReturnRequest`, `Refund`; enums `ShipmentStatus`, `ReturnStatus`, `RefundStatus`; Order relations wired. Seed adds `orders:read|write` and sprint 8 bootstrap marker.
- **Admin Orders API** (`/api/admin/orders/*`, JWT+RBAC `orders:*` + audit): list/filter/pagination, detail (items/payments/history/notes/shipments/invoices/returns/refunds), status/payment update with history, internal notes, shipment create (optionally moves to SHIPPED), invoice generation (snapshot payload), returns list/update, refunds create (PROCESSED can mark order/refund state).
- **Storefront customer order APIs** (`/api/my/orders`, auth): my order list/detail, return request creation. Checkout now records initial status history; sandbox verify records payment/status history and releases stock on non-paid result.
- **Storefront pages**: `/account/orders` and `/account/orders/[id]` show order history/tracking basics (requires `accessToken` in localStorage; full auth UI/session handling remains a follow-up).

## Deferred (roadmap/hardening)
- Invoice PDF rendering, shipping label/provider integrations, customer refund UI polish, full auth-protected storefront session flow, order timeline filters/export, RMA item-level returns, idempotent payment webhooks, and comprehensive tests.

## Local verification
```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @ecom/db prisma:generate
pnpm --filter @ecom/db exec prisma migrate dev --name sprint8_orders_returns_invoices
pnpm --filter @ecom/db prisma:seed
pnpm -r typecheck
pnpm dev
```