import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Extract origin (scheme + host) from the API URL for CSP connect-src
function apiOrigin(url: string): string {
  try {
    const { origin } = new URL(url);
    return origin;
  } catch {
    return url;
  }
}

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

        // Content Security Policy
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Scripts: self + Next.js inline scripts (nonce not yet wired, so unsafe-inline needed for now)
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            // Styles: self + inline styles used by Tailwind
            "style-src 'self' 'unsafe-inline'",
            // Images: self + data URIs (avatars) + Google profile pictures
            "img-src 'self' data: https://lh3.googleusercontent.com https://graph.facebook.com",
            // Fonts: self only
            "font-src 'self'",
            // API calls + NextAuth + Google OAuth
            `connect-src 'self' ${apiOrigin(API_URL)} https://accounts.google.com`,
            // No iframes allowed
            "frame-src 'none'",
            // No plugins
            "object-src 'none'",
            // Restrict base tag
            "base-uri 'self'",
            // Only allow form submissions to self
            "form-action 'self'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default nextConfig;
