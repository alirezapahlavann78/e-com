import type { NextConfig } from "next";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000/api";

const nextConfig: NextConfig = {
  transpilePackages: ["@ecom/ui", "@ecom/types", "@ecom/utils", "@ecom/validation"],
  async rewrites() {
    const apiOrigin = API_INTERNAL_URL.replace(/\/api\/?$/, "");
    return [
      { source: "/api/:path*", destination: `${API_INTERNAL_URL}/:path*` },
      // media uploaded through the admin library is served by the API
      { source: "/uploads/:path*", destination: `${apiOrigin}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
