"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, expectedSessionToken } from "@/lib/auth";

// Only ever send people back to a page on this site. Without this, a link
// like /login?next=https://evil.example would bounce someone who just
// signed in straight onto another site.
function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

function passwordMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));
  const expected = expectedSessionToken();
  const sitePassword = process.env.SITE_PASSWORD;

  if (!expected || !sitePassword || !passwordMatches(password, sitePassword)) {
    // Serverless functions can't easily share a rate limit, so slow every
    // wrong guess down instead; it costs a real user nothing.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    redirect(`/login?next=${encodeURIComponent(next)}&error=1`);
  }

  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });

  redirect(next);
}

export async function logout() {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
