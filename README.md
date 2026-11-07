# E-Commerce Aghaci — Sprint 0 Foundation

Monorepo for a production-oriented fashion e-commerce platform (storefront + admin + API).

## Stack (Sprint 0)
- `apps/web`: Next.js App Router storefront shell
- `apps/admin`: Next.js App Router admin shell
- `apps/api`: NestJS REST API with Swagger and health endpoint
- `packages/db`: Prisma schema/client/seed (PostgreSQL)
- `packages/*`: shared types/validation/utils/ui/config
- `infra/docker-compose.yml`: PostgreSQL + MinIO (S3-compatible)

## Prerequisites
- Node.js >= 20
- pnpm >= 10
- Docker Desktop (for local Postgres/MinIO)

## Local setup
1. Copy `.env.example` to `.env` and adjust secrets/URLs if needed.
2. Start infrastructure:
   ```powershell
   docker compose -f infra/docker-compose.yml up -d
   ```
3. Install dependencies:
   ```powershell
   pnpm install
   ```
4. Generate Prisma client and run initial migration (after DB is up):
   ```powershell
   pnpm db:generate
   pnpm --filter @ecom/db prisma migrate dev --name init
   pnpm db:seed
   ```
5. Run apps:
   ```powershell
   pnpm dev
   ```

## URLs
- Storefront: http://localhost:3000
- Admin: http://localhost:3001
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs
- MinIO console: http://localhost:9001

## Notes
- Sprint 0 provides foundation only; business modules (auth/RBAC/catalog/CMS/orders/inventory) are implemented in subsequent sprints per the approved roadmap.
- Page Builder/CMS will be database-backed and rendered by storefront (no fake admin-only UI).
