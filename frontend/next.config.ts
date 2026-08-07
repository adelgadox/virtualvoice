import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  images: {
    // Instagram Business profile pictures come from the Meta Graph API and are
    // served off Meta's CDNs. The exact subdomain varies per request
    // (scontent-mad1-1, scontent-lhr8-2, …), hence the wildcards.
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "graph.facebook.com" },
    ],
    // Meta signs these URLs with a short expiry. Holding the optimized copy for
    // a day means the avatar survives the source URL going stale.
    minimumCacheTTL: 86_400,
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
