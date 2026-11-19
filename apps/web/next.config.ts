import type { NextConfig } from "next";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000/api";

const nextConfig: NextConfig = {
  transpilePackages: ["@ecom/ui", "@ecom/types", "@ecom/utils", "@ecom/validation"],
  // The storefront talks to the API through a same-origin `/api` path so the
  // browser never needs to reach a private host/port directly.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_INTERNAL_URL}/:path*` }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
