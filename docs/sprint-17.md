# Sprint 17 — Review photos, SEO (sitemap / JSON-LD / OG), skeletons + dark mode

Three deliverables, all wired to real data and the real API. One schema addition (`ReviewImage`),
so run `pnpm db:setup` (and optionally `pnpm db:seed`) after pulling.

## 1. Customer review photos

**Schema** — `packages/db/prisma/schema.prisma`

```prisma
model ReviewImage {
  id        String        @id @default(cuid())
  reviewId  String
  url       String
  alt       String?
  sortOrder Int           @default(0)
  createdAt DateTime      @default(now())
  review    ProductReview @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  @@index([reviewId, sortOrder])
}
```

**API**

| Method | Route | Notes |
| --- | --- | --- |
| POST | `/api/reviews/upload` | public; base64 payload → `apps/api/uploads/reviews/*`, 4 MB limit, images only |
| POST | `/api/reviews/product/:slug` | `images: string[]` (max 3) now accepted; URLs must be `/uploads/…`, `/media/…` or absolute |
| GET | `/api/reviews/product/:slug` | items include `images[]`; summary adds `photoCount` |
| GET | `/api/admin/reviews` | includes `images[]` for moderation |

- Disk writing was extracted to `apps/api/src/common/local-upload.ts` (`saveDataUrl`) and is now shared by
  the admin media library and the review uploader — one place to swap for S3/MinIO later.
- The public uploader has an in-memory quota (20 uploads / 10 min per IP, honouring `x-forwarded-for`),
  so the storefront cannot be used as free file hosting.
- Reviews stay `PENDING` until moderated; photos travel with the review, so nothing appears on the
  storefront before approval.

**Storefront** — `apps/web/src/app/products/[slug]/reviews-wishlist.tsx`

- Photo picker (up to 3, client-side type/size checks, thumbnail previews with remove) inside the review form.
- Review cards render their photos; a lightbox with keyboard navigation (Esc / ← / →) and a per-review counter.
- Summary line shows “N عکس خریداران” and the sidebar shows a photo wall that opens the same lightbox.

**Admin** — `/admin/reviews` rows now show photo thumbnails (opens full size) so moderators judge content
before approving.

**Seed** — every other approved review gets the product's own photos, and a backfill attaches photos to
already-seeded catalogues (idempotent).

## 2. SEO: sitemap, robots, JSON-LD, canonical, OG

| Piece | File | What it does |
| --- | --- | --- |
| `GET /api/cms/sitemap` | `apps/api/src/cms/public-cms.controller.ts` | published products, active categories, published pages (with type) and brands in one request |
| `/sitemap.xml` | `apps/web/src/app/sitemap.ts` | static routes + categories + products + brands + CMS pages (HOME/templates excluded, reserved slugs skipped), `lastModified` from `updatedAt`, hourly revalidate |
| `/robots.txt` | `apps/web/src/app/robots.ts` | allows content, disallows `/api/`, `/account`, `/cart`, `/checkout`, `/compare`, `/admin`, declares the sitemap |
| Organization + WebSite | `apps/web/src/components/json-ld.tsx` (mounted in root layout) | brand entity with `SearchAction` pointing at `/products?q=` |
| Product + BreadcrumbList | `apps/web/src/app/products/[slug]/page.tsx` | price/currency/availability, brand, SKU, images, `aggregateRating` from approved reviews, breadcrumb trail |
| Category BreadcrumbList | `apps/web/src/app/categories/[slug]/page.tsx` | breadcrumb structured data |
| Canonicals | layout / product / category / compare | `alternates.canonical`; `/compare` is `noindex, follow` |
| Share card | `apps/web/src/app/opengraph-image.tsx` | 1200×630 branded OG/Twitter card rendered with `next/og` |
| Icon | `apps/web/src/app/icon.svg` | brand monogram favicon |

Product pages also emit `openGraph` + `twitter` entries using the product photo (absolute URL) and the
short description.

## 3. Loading skeletons + dark mode

**Skeletons** (`apps/web/src/components/skeleton.tsx` + `.skeleton` shimmer in `globals.css`)

- Route-level `loading.tsx` for `/`, `/products`, `/products/[slug]`, `/categories/[slug]`, `/cart`, `/account`;
  each mirrors the real layout (filter rail, product grid, purchase column, cart rows, summary) so there is
  no layout jump when data arrives.
- Shimmer respects `prefers-reduced-motion`.

**Dark mode**

- `.dark` token set in `globals.css` (`--background/--panel/--foreground/--muted/--line/--accent/--ink/--image-bg`),
  plus targeted overrides for primary buttons, active chips, glass header and placeholder surfaces.
- Initial theme is applied by a small inline script in the root layout **before paint** (no flash), honouring
  `localStorage.theme` and falling back to `prefers-color-scheme`.
- `ThemeToggle` (`apps/web/src/components/theme-toggle.tsx`) sits in the header and in the mobile drawer,
  persists the choice, updates `theme-color`, and exposes `aria-pressed`.
- Image placeholders were moved from a hard-coded `#ece4d6` to `var(--image-bg)` (14 spots) so cards follow
  the theme; solid white chips in filters/compare now use `var(--panel)`.

## Verification

```bash
pnpm install && pnpm db:generate && pnpm --filter @ecom/db build
pnpm db:local        # terminal 1
pnpm db:setup        # creates ReviewImage
pnpm db:seed         # review photos + backfill
pnpm dev             # terminal 2
```

Checked with curl:

- `POST /api/reviews/upload` → `/uploads/reviews/1795132604683-customer-photo-fe1466.jpg`, file served (200).
- `POST /api/reviews/product/cashmere-crewneck` with that URL → review created with its image.
- `GET /api/reviews/product/wool-wrap-coat` → `photoCount: 2`, approved review carries both photos.
- `/sitemap.xml` → 31 URLs; `/robots.txt` → disallow list + sitemap; `/opengraph-image` → 200 `image/png`.
- Product HTML contains `"@type":"Product"` with `aggregateRating`, canonical link, and review photos.
- `.dark` custom properties are present in the production CSS bundle.
- `pnpm --filter @ecom/{api,web,admin} typecheck`, `pnpm --filter @ecom/api build` and `pnpm --filter @ecom/web build` pass.
