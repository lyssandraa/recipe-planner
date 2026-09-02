import type { CSSProperties, ReactNode } from "react";

// Shared shell for the recipe and product detail screens: white, 16px
// radius, a 3px bottom border in a category-appropriate colour, and a
// section header row (emoji, then an uppercase green-deep label, then an
// optional muted count pushed right). Used for Ingredients/Method on the
// recipe page and Storage/Composition/Ingredients/Claims on the product
// page, so both screens read as one visual language.
export default function DetailCard({
  emoji,
  title,
  meta,
  children,
  className = "",
  borderClassName = "border-lime-tint",
  style,
}: {
  emoji: string;
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
  // Tailwind border-color class for the 3px bottom border, e.g.
  // "border-amber". Defaults to a neutral pale lime.
  borderClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border-b-[3px] bg-card p-4 shadow-sm ${borderClassName} ${className}`}
      style={style}
    >
      <div className={children ? "mb-3 flex items-center gap-1.5" : "flex items-center gap-1.5"}>
        <span className="shrink-0 text-base leading-none">{emoji}</span>
        <h2 className="text-[11px] font-bold tracking-wide text-green-deep uppercase">
          {title}
        </h2>
        {meta && <span className="ml-auto shrink-0 text-xs font-normal text-ink-soft normal-case">{meta}</span>}
      </div>
      {children}
    </div>
  );
}
