import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
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
