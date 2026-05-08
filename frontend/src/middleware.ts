import { auth } from "@/../auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];

function buildCsp(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  let apiOrigin = apiUrl;
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    // keep raw value
  }

  return [
    "default-src 'self'",
    // unsafe-inline required: Next.js App Router injects hydration scripts without nonces.
    // Nonce propagation requires layout-level integration not yet implemented.
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://lh3.googleusercontent.com https://graph.facebook.com",
    "font-src 'self' https://fonts.gstatic.com",
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

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", buildCsp());
  return res;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
