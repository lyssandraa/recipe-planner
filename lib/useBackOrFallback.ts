"use client";

import { useRouter } from "next/navigation";
import { hasNavigatedInApp } from "@/app/components/navigation-tracker";

// router.back() when this tab has actually moved between screens before
// (tracked by NavigationTracker, mounted once in the root layout);
// otherwise a deterministic fallback route. history.length isn't a
// reliable signal for this: a plain page load can already count as more
// than one entry, which would otherwise send "back" to about:blank on a
// fresh deep link instead of somewhere sensible.
export function useBackOrFallback(fallbackHref: string): () => void {
  const router = useRouter();
  return () => {
    if (hasNavigatedInApp()) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };
}
