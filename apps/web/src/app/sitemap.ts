import { api } from "../lib/api";

type SitemapEntry = { slug?: string; updatedAt?: string; type?: string };

export const revalidate = 3600;

export default async function sitemap() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const data = await api<{
    products: SitemapEntry[];
    categories: SitemapEntry[];
    pages: SitemapEntry[];
    brands: SitemapEntry[];
  }>("/cms/sitemap").catch(() => ({ products: [], categories: [], pages: [], brands: [] }));

  const url = (path: string) => `${base}${path}`;
  const lastModified = (entry?: SitemapEntry) => (entry?.updatedAt ? new Date(entry.updatedAt) : new Date());

  const staticRoutes = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/products", priority: 0.9, changeFrequency: "daily" as const },
  ];

  const reservedSlugs = new Set(["products", "api", "admin", "categories", "brands", "login", "cart", "checkout", "compare", "account", "about"]);
  // HOME / *_TEMPLATE / BRAND pages are not standalone content URLs.
  const pageTypes = new Set(["STATIC", "CUSTOM", "LANDING", "BLOG"]);

  return [
    ...staticRoutes.map((route) => ({
      url: url(route.path),
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...data.categories
      .filter((entry) => entry.slug)
      .map((entry) => ({
        url: url(`/categories/${entry.slug}`),
        lastModified: lastModified(entry),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...data.products
      .filter((entry) => entry.slug)
      .map((entry) => ({
        url: url(`/products/${entry.slug}`),
        lastModified: lastModified(entry),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...data.brands
      .filter((entry) => entry.slug)
      .map((entry) => ({
        url: url(`/brands/${encodeURIComponent(entry.slug!)}`),
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ...data.pages
      .filter((entry) => entry.slug && !reservedSlugs.has(entry.slug) && pageTypes.has(entry.type ?? ""))
      .map((entry) => ({
        url: url(`/${entry.slug}`),
        lastModified: lastModified(entry),
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
  ];
}
