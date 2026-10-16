import { NextResponse, type NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "jm_access_token";
const LOGIN_PATH = "/login";
const PUBLIC_ROUTE_PREFIXES = ["/login", "/register", "/auth/callback", "/api", "/_next"];
const PROTECTED_ROUTE_PREFIXES = ["/dashboard"];

function isPublicRoute(pathname: string): boolean {
  return pathname === "/favicon.ico" || PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Redirects to login when a protected page is opened without the backend's auth cookie. */
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicRoute(pathname) || !isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const hasAccessToken = Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value);
  if (!hasAccessToken) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Every path except static assets, image optimisation, the favicon and image files
    "/((?!_next/static|_next/image|favicon.ico|api/hooks/catch|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
