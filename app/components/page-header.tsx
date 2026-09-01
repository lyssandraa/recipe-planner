"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { useBackOrFallback } from "@/lib/useBackOrFallback";

export default function PageHeader({
  title,
  subtitle,
  action,
  icon,
  extra,
  backFallbackHref,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  // A rendered icon element (e.g. <IconBook2 size={24} stroke={1.75} />),
  // not a component reference. Component types can't cross the server or
  // client boundary as props, but an already-rendered element can.
  icon: ReactNode;
  // Extra content under the title/subtitle row, still inside the sage-deep
  // block (e.g. the shopping list's counts and progress bar). Collapses
  // away on scroll the same way the subtitle does.
  extra?: ReactNode;
  // Shows a back button when set. Only pass this on screens that aren't
  // one of the six bottom-nav destinations, those don't need a way back,
  // they're already where you'd go back to. The fallback route is used
  // when there's no history to actually go back to (a direct link, a
  // fresh tab), so the button is never a dead end.
  backFallbackHref?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const goBack = useBackOrFallback(backFallbackHref ?? "/");

  useEffect(() => {
    function onScroll() {
      setCollapsed(window.scrollY > 24);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 overflow-hidden bg-sage-deep px-4 transition-[padding] duration-200 ${
        collapsed ? "py-2.5" : "py-5"
      }`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-6 h-28 w-28 rounded-full bg-peridot opacity-35"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -right-2 h-20 w-20 rounded-full bg-mint opacity-25"
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {backFallbackHref && (
            <button
              type="button"
              onClick={goBack}
              aria-label="Back"
              className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
            >
              <IconArrowLeft size={19} stroke={2} />
            </button>
          )}
          <div className="min-w-0">
            <h1
              className={`truncate font-semibold text-white transition-[font-size] duration-200 ${
                collapsed ? "text-base" : "text-xl"
              }`}
            >
              <Link href="/">{title}</Link>
            </h1>
            {subtitle && (
              <p
                className={`truncate text-xs text-sage-light transition-all duration-200 ${
                  collapsed ? "mt-0 max-h-0 opacity-0" : "mt-0.5 max-h-4 opacity-100"
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span
            className={`motion-safe:animate-drift text-white/70 transition-transform duration-200 ${
              collapsed ? "scale-75" : "scale-100"
            }`}
          >
            {icon}
          </span>
          {action && (
            <Link
              href={action.href}
              className="rounded-full bg-mint px-3 py-1.5 text-xs font-medium whitespace-nowrap text-olive-text"
            >
              {action.label}
            </Link>
          )}
        </div>
      </div>

      {extra && (
        <div
          className={`relative transition-all duration-200 ${
            collapsed ? "mt-0 max-h-0 overflow-hidden opacity-0" : "mt-3 max-h-20 opacity-100"
          }`}
        >
          {extra}
        </div>
      )}
    </header>
  );
}
