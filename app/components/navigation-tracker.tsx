"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "rp-has-navigated";

// Records, per tab, whether the app has actually moved between screens at
// least once. useBackOrFallback reads this to decide whether router.back()
// has somewhere real to land: history.length is not a reliable signal for
// that (a plain page load already counts as more than one history entry
// in some browsers, so a fresh deep link's "back" can otherwise land on
// about:blank instead of a sensible fallback route).
export default function NavigationTracker() {
  const pathname = usePathname();
  // Compares against the last pathname actually seen, rather than a
  // one-shot "have we run yet" boolean: React Strict Mode double-invokes
  // effects in development, which would flip a boolean flag on its first
  // (synthetic) pass and then wrongly mark the very first page load as a
  // navigation on the second pass, even though pathname never changed.
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (lastPathname.current === null) {
      lastPathname.current = pathname;
      return;
    }
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Storage unavailable (private browsing, etc), the back button just
      // falls back to its default route a little more often than strictly
      // necessary, never worse than that.
    }
  }, [pathname]);

  return null;
}

export function hasNavigatedInApp(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
