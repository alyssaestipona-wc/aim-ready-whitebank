import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aim-ready/ui", "@aim-ready/core"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
