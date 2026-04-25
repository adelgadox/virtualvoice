import { auth } from "@/../auth";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const PUBLIC_ROUTES = ["/login"];

function buildCsp(nonce: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  let apiOrigin = apiUrl;
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    // keep raw value
  }

  return [
    "default-src 'self'",
    // Nonce replaces unsafe-inline and unsafe-eval for scripts
    `script-src 'self' 'nonce-${nonce}' https://va.vercel-scripts.com`,
    // Tailwind requires unsafe-inline for styles; nonce not practical here
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://lh3.googleusercontent.com https://graph.facebook.com",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin} https://accounts.google.com https://vitals.vercel-insights.com`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Registration is closed — redirect /register to /login regardless of auth state
  if (pathname.startsWith("/register")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.auth && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Generate a per-request nonce and inject it into the CSP header
  const nonce = randomBytes(16).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", buildCsp(nonce));
  return res;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
