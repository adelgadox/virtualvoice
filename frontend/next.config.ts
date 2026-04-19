import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The panel is an internal tool — no public indexing needed
  headers: async () => [
    {
      source: "/(.*)",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
    },
  ],
};

export default nextConfig;
