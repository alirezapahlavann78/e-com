# Sprint 13 — Admin Workspace, Page Builder UX & Settings

## Delivered

### Admin design system
- `apps/admin/src/app/globals.css`: warm token set shared with the storefront (light/dark), Vazirmatn, `.surface`/`.card-title` primitives; `ui.tsx` variants retargeted to `var(--accent)` so every legacy screen inherits the new palette.
- `components/admin-shell.tsx` rewritten: four nav groups (فروش، محتوا، مشتریان و بازاریابی، عملیات), collapsible sidebar, storefront link, date in the header, themed logout.
- Split-screen login (`/login`) with studio imagery and demo-credential hint.

### Dashboard (`app/page.tsx`)
- KPI cards (today, 30-day revenue, AOV, customers/products), SVG area chart with hover tooltip for 14-day revenue, order-status distribution bars, recent orders, top products, low-stock alerts.
- `StatsService.dashboard()` extended with `revenue30d`, `orders30d`, `averageOrderValue` and `topProducts` (paid orders).

### Visual page builder (`app/cms/pages`, `app/cms/pages/[id]`, `lib/cms-sections.ts`)
- Page library: card grid with status, versions, last edit, create dialog (title/slug/type), delete.
- Builder workspace: ordered section list (drag & drop + ▲▼), visibility toggle, duplicate, delete; live wireframe preview (desktop/tablet/mobile) that reflects unsaved edits; inspector generated from a typed schema for all 16 supported section types (text/textarea/number/select/boolean/image + repeatable lists); page settings (title, slug, type, SEO); draft save → new `PageVersion`; publish; version history with one-click restore.
- Backed by the real `PATCH /admin/cms/pages/:id` (creates a draft version) and `POST /admin/cms/pages/:id/publish`, so storefront rendering changes immediately after publish.

### Store settings (`app/settings`)
- Reads `GET /admin/settings`, groups by prefix, edits store identity, shipping rates/free-shipping threshold, payment provider and currency; per-key `PUT` with change detection; live shipping simulation panel. Shipping values feed `CartService.shippingQuote()` and checkout.

## Verified
- `tsc --noEmit` clean for `apps/admin`; all admin routes return 200 (`/`, `/login`, `/cms/pages`, `/cms/pages/:id`, `/settings`, `/products`, `/orders`).
- Builder round-trip against the live API: create page → patch two sections → publish → `GET /api/cms/pages/:slug` returns both sections in order → storefront `/:slug` renders them.
- Admin API surface exercised: `/admin/products`, `/admin/categories`, `/admin/orders`, `/crm/customers`, `/discounts`, `/admin/inventory/items`, `/admin/reviews`, `/admin/media`, `/admin/cms/layout`, `/marketing/campaigns`, `/admin/orders/returns`.
- Customer surface: login, `/my/orders`, `/my/wishlist`, `/my/profile`, `/auth/me`.

## Notes
- Media library (`/admin/media`) and role/user/audit screens remain API-only: they were removed from the navigation to keep the screen set limited as requested.
