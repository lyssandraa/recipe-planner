import type { JSX } from "react";
import type { IngredientCategory } from "@prisma/client";

export type CategoryIconProps = {
  size?: number;
  className?: string;
};

const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  PRODUCE: "🥕",
  MEAT_FISH: "🥩",
  DAIRY: "🥛",
  DRY_GOODS: "🌾",
  TINS_JARS: "🥫",
  SPICES: "🧂",
  FROZEN: "❄️",
  OTHER: "📦",
};

export function getCategoryEmoji(category: IngredientCategory): string {
  return CATEGORY_EMOJI[category];
}

// Renders the category's emoji at a given size. Kept as a render function
// (mirrors the old Tabler-icon API) so call sites didn't need to change
// shape when this switched from icon components to emoji.
export function renderCategoryIcon(
  category: IngredientCategory,
  props: CategoryIconProps
): JSX.Element {
  return (
    <span
      style={{ fontSize: props.size ?? 16, lineHeight: 1 }}
      className={props.className}
    >
      {CATEGORY_EMOJI[category]}
    </span>
  );
}
