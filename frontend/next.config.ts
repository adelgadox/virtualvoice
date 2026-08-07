import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    // Cloudinary does the optimizing, not Vercel. A custom loader bypasses
    // /_next/image completely, so no image-optimization units are billed.
    // remotePatterns is deliberately absent — it only governs Vercel's
    // optimizer, which never runs here.
    loader: "custom",
    loaderFile: "./src/lib/cloudinary-loader.ts",
    // Avatars render at 40px CSS; 40/80/120 covers 1x/2x/3x with no waste.
    imageSizes: [40, 80, 120],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Prevent search-engine indexing — internal tool
        { key: "X-Robots-Tag", value: "noindex, nofollow" },

        // Clickjacking protection
        { key: "X-Frame-Options", value: "DENY" },

        // Prevent MIME-type sniffing
        { key: "X-Content-Type-Options", value: "nosniff" },

        // Referrer policy — don't leak URL in cross-origin requests
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

        // Disable dangerous browser features
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), payment=()",
        },

        // HSTS — only in production (browsers ignore it over HTTP anyway)
        ...(isDev
          ? []
          : [
              {
                key: "Strict-Transport-Security",
                value: "max-age=63072000; includeSubDomains; preload",
              },
            ]),

        // CSP is set per-request with a nonce in middleware.ts — not here
      ],
    },
  ],
};

export default nextConfig;
