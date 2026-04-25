import { auth } from "@/../auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login"];

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

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
