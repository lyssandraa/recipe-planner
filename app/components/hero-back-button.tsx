"use client";

import { useBackOrFallback } from "@/lib/useBackOrFallback";
import { IconArrowLeft } from "@tabler/icons-react";

// A 32px white circle at 90% opacity, sitting on a hero image or colour
// block. Uses browser history rather than a fixed route, detail pages are
// reached from several different lists (recipes, what-can-i-make, scan),
// falling back to fallbackHref when there's no history to go back to (a
// direct link or a fresh tab).
export default function HeroBackButton({ fallbackHref }: { fallbackHref: string }) {
  const goBack = useBackOrFallback(fallbackHref);

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Back"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm"
    >
      <IconArrowLeft size={17} stroke={2} />
    </button>
  );
}
