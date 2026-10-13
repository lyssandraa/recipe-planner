import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, expectedSessionToken } from "./lib/auth";

// Gates pages behind the shared SITE_PASSWORD. Recipe/product browsing and
// the scanner stay public, on purpose, so the repo can live on a public
// GitHub without exposing what's actually personal: stock levels, the
// shopping list and spend history, and the full-data backup export. Recipe
// create/edit/import pages are gated too, not because viewing them is
// sensitive, but so a stranger can't vandalise or spam the public recipe
// list. This only covers page navigation, every write action also checks
// requireAuth() itself (see lib/auth.ts and every actions.ts file), since
// a Server Action is a POST to its own route and a matcher change here
// could otherwise silently stop protecting it.
export const config = {
  matcher: [
    "/pantry/:path*",
    "/shopping-list/:path*",
    "/settings/:path*",
    "/recipes/new",
    "/recipes/:id/edit",
    "/recipes/import/:path*",
    "/products/new",
  ],
};

export function proxy(request: NextRequest) {
  const expected = expectedSessionToken();

  // SITE_PASSWORD isn't set: fail closed, not open. /login explains why
  // instead of silently leaving these pages unprotected.
  if (!expected || request.cookies.get(AUTH_COOKIE_NAME)?.value !== expected) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
