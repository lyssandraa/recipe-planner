"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, expectedSessionToken } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const expected = expectedSessionToken();

  if (!expected || password !== process.env.SITE_PASSWORD) {
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

  redirect(next || "/");
}

export async function logout() {
  const store = await cookies();
  store.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
