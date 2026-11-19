/**
 * Renders schema.org structured data. Client-side nothing happens; the JSON is
 * inlined into the server-rendered HTML so crawlers see it without JS.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function organizationJsonLd(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, "");
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "آگاهی",
      alternateName: "AGHACI",
      url: base,
      logo: `${base}/icon.svg`,
      description: "پوشاک مینیمال ایرانی با تولید محدود و پارچه‌های طبیعی.",
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "customer service",
          areaServed: "IR",
          availableLanguage: ["fa"],
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "آگاهی",
      url: base,
      inLanguage: "fa-IR",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${base}/products?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
