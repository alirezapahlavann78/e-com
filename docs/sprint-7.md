# Sprint 7 Report — Inventory, Warehouses & Anti-Oversell

## Status
Code-complete foundation in source. **Verification blocked** by missing installed dependencies/lockfile in this environment (registry/network blocker), so Prisma migration/generate, TypeScript/build, and runtime tests were not executed here.

## Implemented
- **Prisma**: `Warehouse`, `InventoryItem` (qty/reserved/lowStock per warehouse+product/variant), `StockMovement` (IN/OUT/ADJUST/TRANSFER/RESERVE/RELEASE/COMMIT), `StockReservation` (ACTIVE/COMMITTED/RELEASED/EXPIRED), `Supplier`. Relations added to Product/ProductVariant/Order. Seed adds `inventory:read|write`, default `MAIN` warehouse, default supplier; bootstrap marker sprint 7.
- **Inventory admin APIs** (`/api/admin/inventory/*`, JWT+RBAC `inventory:*` + audit): warehouses, suppliers, inventory items/set, manual adjust (transactional with movement), movements list, reservations list, low-stock filter (`?lowOnly=true`).
- **Anti-oversell / checkout integration**: checkout transaction checks available stock (warehouse inventory when present, fallback to product/variant fields), decrements product/variant and warehouse inventory, creates `StockReservation` (COMMITTED) and `COMMIT` movement per item, snapshots order. Sandbox verify failure/cancellation releases stock and records `RELEASE` movements + reservation status.

## Deferred (roadmap/hardening)
- Real pre-checkout reservation hold with expiry worker/release, warehouse transfer UI/workflow, supplier purchase receipts, concurrent reservation locking strategy at scale (row locks/SERIALIZABLE as needed), full stock sync jobs, and automated race-condition tests.

## Local verification
```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @ecom/db prisma:generate
pnpm --filter @ecom/db exec prisma migrate dev --name sprint7_inventory
pnpm --filter @ecom/db prisma:seed
pnpm -r typecheck
pnpm dev
```