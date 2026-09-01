import type { CSSProperties, ReactNode } from "react";

// Shared shell for the recipe and product detail screens: white, 14px
// radius, an icon (peridot) + title row with optional trailing meta,
// pushed right. Used for Ingredients/Method on the recipe page and
// Storage/Composition/Ingredients/Claims on the product page, so both
// screens read as one visual language.
export default function DetailCard({
  icon,
  title,
  meta,
  children,
  className = "",
  style,
}: {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`rounded-[14px] bg-card p-4 shadow-sm ${className}`} style={style}>
      <div className={children ? "mb-3 flex items-center gap-2" : "flex items-center gap-2"}>
        <span className="shrink-0 text-peridot">{icon}</span>
        <h2 className="font-semibold text-sage-darker">{title}</h2>
        {meta && <span className="ml-auto shrink-0">{meta}</span>}
      </div>
      {children}
    </div>
  );
}
