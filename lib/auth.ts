import { createHash } from "node:crypto";
import { cookies } from "next/headers";

// Single shared password, not per-user accounts, this is a personal
// single-user app. The cookie never stores the password itself, just a
// one-way hash of it, so the proxy and every Server Action can verify a
// session without a database or a session store, while still leaving
// nothing more reversible than "logged in" sitting in the browser.
export const AUTH_COOKIE_NAME = "rp_session";

export function expectedSessionToken(): string | null {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

export async function isAuthenticated(): Promise<boolean> {
  const expected = expectedSessionToken();
  if (!expected) return false;
  const store = await cookies();
  return store.get(AUTH_COOKIE_NAME)?.value === expected;
}

// Defense in depth: proxy.ts gates page navigation by path, but a Server
// Action is really just a POST to the route it's defined on, a matcher
// that's ever narrowed or a shared action moved to a new file could
// silently drop proxy coverage without this. Every pantry and shopping
// list action calls this directly, not just the pages that render them.
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    throw new Error("Not signed in.");
  }
}
