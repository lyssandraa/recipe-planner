import type { JSX } from "react";
import type { IngredientCategory } from "@prisma/client";

export type ShoppingCategoryIconProps = {
  size?: number;
  className?: string;
};

// Emoji per category for the shopping list's group headers. Kept separate
// from lib/categoryIcons.tsx (the pantry's row icons) since "Other" reads
// better here as a basket than a box.
const SHOPPING_CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  PRODUCE: "🥕",
  MEAT_FISH: "🥩",
  DAIRY: "🥛",
  DRY_GOODS: "🌾",
  TINS_JARS: "🥫",
  SPICES: "🧂",
  BAKING: "🧁",
  FROZEN: "❄️",
  OTHER: "🧺",
};

export function getShoppingCategoryEmoji(category: IngredientCategory): string {
  return SHOPPING_CATEGORY_EMOJI[category];
}

export function renderShoppingCategoryIcon(
  category: IngredientCategory,
  props: ShoppingCategoryIconProps
): JSX.Element {
  return (
    <span style={{ fontSize: props.size ?? 16, lineHeight: 1 }} className={props.className}>
      {SHOPPING_CATEGORY_EMOJI[category]}
    </span>
  );
}
