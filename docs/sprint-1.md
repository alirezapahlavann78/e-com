# Sprint 1 Report — Identity & Core Platform (code-complete scaffold)

## Status
Implementation added in source; **install/typecheck/build/runtime verification blocked** in this environment because `pnpm install` cannot complete (registry/network errors). No `node_modules`/lockfile present.

## Implemented
- **Prisma schema** (`packages/db/prisma/schema.prisma`): `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `RefreshToken` (rotation family/revoke fields), `AuditLog`, `StoreSetting`, `UserStatus` enum.
- **Seed** (`packages/db/prisma/seed.ts`): base permissions, system `admin` role, bootstrap admin user (`ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD`), role assignment, audit entry.
- **API core**:
  - Global `PrismaModule`/`PrismaService`
  - `JwtAuthGuard` (global, respects `@Public`) + `PermissionsGuard` (global, `@RequirePermissions`)
  - `AuthModule`: `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `GET /api/auth/me` (Bearer). Refresh tokens hashed (SHA-256), stored with family/expiry, rotated; family revoked on reuse/logout.
  - `UsersModule` (admin): `GET/POST/PATCH /api/admin/users` with `users:read|write`
  - `RbacModule` (admin): roles/permissions endpoints with `rbac:read|manage`
  - `SettingsModule` (admin): list/upsert settings with `settings:read|write` + audit
  - `AuditModule`: service + `GET /api/admin/audit-logs` with `audit:read`
  - Health endpoint marked public; Swagger already configured at `/api/docs`

## Verification needed locally
```powershell
pnpm install
docker compose -f infra/docker-compose.yml up -d
pnpm --filter @ecom/db prisma:generate
pnpm --filter @ecom/db exec prisma migrate dev --name sprint1_identity_rbac
pnpm --filter @ecom/db prisma:seed
pnpm --filter @ecom/api typecheck
pnpm --filter @ecom/api build
pnpm dev
```

## Security/quality notes
- Passwords hashed with Node `scrypt` (no extra dependency required at runtime once deps installed); refresh tokens never stored raw.
- Admin APIs protected by auth + RBAC permissions; `isAdmin` bypass kept for bootstrap/system admin.
- Critical flows (refresh rotation, role assignment updates) use Prisma transactions where appropriate.
- Follow-up hardening (Sprint 11/ongoing): rate limiting, account lockout, email verification, CSRF strategy for cookie mode if adopted, stricter audit metadata/redaction, comprehensive tests.
