# Sprint 14 — Customer account panel (redesign + real features)

The storefront «حساب من» is now a premium RTL workspace instead of three plain tabs.
Everything reads and writes real data; no mock rows and no dead buttons.

## Layout

- **Hero card** (dark, brand-consistent): avatar initial, name, email, live counters (orders, points, tier) and logout.
- **Sticky sidebar**: five sections with icons and live badges + a loyalty card showing tier progress.
- **Content area**: responsive panels, empty states with a call to action, inline Persian notices.

Sections: `نمای کلی` · `سفارش‌ها` · `آدرس‌ها` · `علاقه‌مندی‌ها` · `حساب من`.

## Features

### Overview
Four stat cards (orders, in-transit, total spent, loyalty points), the three most recent orders with an inline
4-step timeline (ثبت → پرداخت → ارسال → تحویل), and quick links to addresses / wishlist / delivered orders.

### Orders
Every order is a collapsible card: status pill, date, item count, total, always-visible timeline, and on expand
the line items (with images), shipment carrier + tracking number, and links to the full order page or to a
return request for delivered orders. Data comes from `GET /api/my/orders` (items, shipments, statusHistory).

### Address book (new API)
Full CRUD backed by `CustomerAddress`:

| Method | Route | Notes |
| --- | --- | --- |
| GET | `/api/my/addresses` | default first |
| POST | `/api/my/addresses` | first address becomes default automatically |
| PATCH | `/api/my/addresses/:id` | ownership checked |
| DELETE | `/api/my/addresses/:id` | addresses already used by an order are archived instead of deleted |
| POST | `/api/my/addresses/:id/default` | clears the previous default in one transaction |

The UI has an inline add/edit form (title, receiver, phone, province, city, postal code, address, extra line,
default checkbox), a default badge, «پیش‌فرض کن», edit and delete with confirmation.

### Wishlist
Product cards with image, price, «افزودن به سبد» (calls the real cart API) and delete.

### Account
- `PATCH /api/my/profile` — first/last name, phone, `marketingOptIn`, `smsOptIn` (copied to `CustomerProfile`).
- `POST /api/my/password` — verifies the current password, rejects reusing it, re-hashes with scrypt and revokes
  every refresh token so other devices sign in again.
- Email is shown read-only (changing it needs verification, out of scope).

### Loyalty (`GET /api/my/summary`)
- 1 point per 100,000 toman paid.
- Tiers: عضو تازه (0) · عضو نقره‌ای (5M, 5%) · عضو طلایی (15M, 10%).
- Returns `points`, `tier`, `tierLabel`, `discount`, `progress` and the amount remaining to the next tier.

## Verification performed

```
pnpm --filter @ecom/api typecheck   ✔
pnpm --filter @ecom/web typecheck   ✔

GET  /api/my/summary      → orders 2 · spent 12,750,000 · tier عضو نقره‌ای · 127 points · progress 78%
GET  /api/my/addresses    → 1 seeded address (خانه, default)
POST /api/my/addresses    → 201 (محل کار) · POST :id/default → previous default cleared
PATCH /api/my/addresses/:id → 200 (address line updated)
DELETE /api/my/addresses/:id → {ok:true, archived:false}
PATCH /api/my/profile     → name/phone saved, smsOptIn persisted in CustomerProfile
POST /api/my/password     → 403 on wrong current password · 201 on success · login with new password 201
                            (and reverted back to the demo password)
/account (Next dev)       → HTTP 200, /api/my/summary through the storefront rewrite → 200
```

## Notes / limits

- The addresses are not yet offered as a picker inside checkout; the checkout form still takes the address inline.
  That is the natural next increment if we want one-tap checkout.
- Points are derived from paid orders on every request (no ledger table), so they cannot drift.
- No schema change was required: `CustomerAddress`, `CustomerProfile` and `OrderStatusHistory` already existed.
