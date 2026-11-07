import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ecom/ui", "@ecom/types", "@ecom/utils", "@ecom/validation"],
};

export default nextConfig;
