"use client";

import { useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { ComponentType, Unit } from "@prisma/client";
import { IconChevronDown } from "@tabler/icons-react";
import { COMPONENT_TYPE_EMOJI, COMPONENT_TYPE_LABELS } from "@/lib/componentTypes";
import { formatQuantityUnit } from "@/lib/units";
import DetailCard from "@/app/components/detail-card";

export type ComponentCardData = {
  id: string;
  title: string;
  componentType: ComponentType | null;
  note: string | null;
  ingredients: {
    id: string;
    quantity: number | null;
    unit: Unit | null;
    note: string | null;
    ingredientName: string;
  }[];
};

// Shows recipes this one uses as a component (a marinade, spice mix,
// sauce...) with a quick expand for the ingredient list, so mid-cook there's
// no need to navigate away just to check what's in the marinade. Tapping
// the name still opens the component's own full recipe page.
export default function ComponentsCard({
  components,
  className,
  style,
}: {
  components: ComponentCardData[];
  className?: string;
  style?: CSSProperties;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (components.length === 0) return null;

  return (
    <DetailCard
      emoji="🫙"
      title="Components used"
      borderClassName="border-pink-tint"
      meta={<span className="text-xs text-ink-soft">{components.length}</span>}
      className={className}
      style={style}
    >
      <ul className="flex flex-col divide-y divide-border-soft">
        {components.map((c) => {
          const expanded = expandedId === c.id;
          return (
            <li key={c.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-lg leading-none">
                  {c.componentType ? COMPONENT_TYPE_EMOJI[c.componentType] : "🫙"}
                </span>
                <Link
                  href={`/recipes/${c.id}`}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-ink"
                >
                  {c.title}
                </Link>
                {c.componentType && (
                  <span className="shrink-0 rounded-full bg-pink-tint px-2 py-0.5 text-[10px] font-medium text-ink">
                    {COMPONENT_TYPE_LABELS[c.componentType]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : c.id)}
                  aria-label={expanded ? "Collapse ingredients" : "Expand ingredients"}
                  className="shrink-0 text-ink-soft"
                >
                  <IconChevronDown
                    size={16}
                    stroke={2}
                    className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
              {c.note && <p className="mt-1 pl-7 text-xs text-ink-soft">{c.note}</p>}
              {expanded && (
                <ul className="mt-2 flex flex-col gap-1 rounded-lg bg-cream-grey p-2.5">
                  {c.ingredients.map((ri) => (
                    <li key={ri.id} className="flex items-center gap-2 text-xs text-ink">
                      <span className="w-16 shrink-0 font-medium text-green-deep">
                        {formatQuantityUnit(ri.quantity, ri.unit)}
                      </span>
                      <span>
                        {ri.ingredientName}
                        {ri.note ? `, ${ri.note}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </DetailCard>
  );
}
