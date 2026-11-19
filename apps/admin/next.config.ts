import type { NextConfig } from "next";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4000/api";

const nextConfig: NextConfig = {
  transpilePackages: ["@ecom/ui", "@ecom/types", "@ecom/utils", "@ecom/validation"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_INTERNAL_URL}/:path*` }];
  },
};

export default nextConfig;
