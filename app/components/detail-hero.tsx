import type { ReactNode } from "react";
import HeroBackButton from "./hero-back-button";

// Shared 150px hero for the recipe and product detail screens: an image
// (or the same deterministic colour block used on recipe cards) under a
// bottom-heavy gradient for text legibility, a decorative mint circle,
// a back button, an optional top-right slot, and a title/subtitle pair
// anchored to the bottom-left.
export default function DetailHero({
  imageUrl,
  colorBlockClass,
  emoji,
  title,
  subtitle,
  topRight,
  backFallbackHref,
  accentClassName = "bg-amber",
}: {
  imageUrl?: string | null;
  colorBlockClass: string;
  // Large centred emoji shown over the colour block when there's no photo
  // (dropped automatically once a real photo is available).
  emoji?: string;
  title: string;
  subtitle?: string | null;
  topRight?: ReactNode;
  backFallbackHref: string;
  // Decorative circle colour, varied per screen (recipe hero vs product
  // hero) so they don't read as identical.
  accentClassName?: string;
}) {
  return (
    <div className="relative h-[150px] overflow-hidden">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary external host, not a static asset
        <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className={`absolute inset-0 flex items-center justify-center ${colorBlockClass}`}>
          {emoji && <span className="text-6xl opacity-90">{emoji}</span>}
        </div>
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(34,51,31,0.75))" }}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full opacity-[0.28] ${accentClassName}`}
      />

      <div className="relative flex items-center justify-between p-3">
        <HeroBackButton fallbackHref={backFallbackHref} />
        {topRight}
      </div>

      <div className="absolute right-3 bottom-3 left-3">
        <h1 className="text-[21px] leading-tight font-semibold text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-white/80">{subtitle}</p>}
      </div>
    </div>
  );
}
