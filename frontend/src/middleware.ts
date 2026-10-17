import { NextResponse, type NextRequest } from "next/server";

// The access cookie expires after ~15 minutes while the refresh cookie lasts days;
// either one means the client can still restore the session via /auth/refresh.
const AUTH_COOKIES = ["jm_access_token", "jm_refresh_token"];
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
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicRoute(pathname) || !isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const hasAuthCookie = AUTH_COOKIES.some((cookieName) => Boolean(request.cookies.get(cookieName)?.value));
  if (!hasAuthCookie) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Every path except static assets, image optimisation, the favicon and image files
    "/((?!_next/static|_next/image|favicon.ico|api/hooks/catch|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
