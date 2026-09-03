import type { StockLevel, IngredientCategory } from "@prisma/client";

export const STOCK_LEVELS: StockLevel[] = ["PLENTY", "LOW", "OUT"];

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  PLENTY: "Plenty",
  LOW: "Low",
  OUT: "Out",
};

// Tailwind classes for the stock level toggle, using the theme tokens only.
// Same state-colour convention as effort: lime for plenty, amber for low,
// terracotta for out.
export function getStockLevelClasses(level: StockLevel, active: boolean): string {
  if (!active) return "bg-card text-ink-soft border border-border-soft";
  switch (level) {
    case "PLENTY":
      return "bg-lime-tint text-green-deep";
    case "LOW":
      return "bg-amber-tint text-amber-text";
    case "OUT":
      return "bg-terracotta-tint text-terracotta-text";
  }
}

// Plain text colour for the stock level, e.g. the pantry header's count row.
export function getStockLevelTextClass(level: StockLevel): string {
  switch (level) {
    case "PLENTY":
      return "text-lime";
    case "LOW":
      return "text-amber";
    case "OUT":
      return "text-terracotta";
  }
}

export const CATEGORY_ORDER: IngredientCategory[] = [
  "PRODUCE",
  "MEAT_FISH",
  "DAIRY",
  "DRY_GOODS",
  "TINS_JARS",
  "SPICES",
  "BAKING",
  "FROZEN",
  "OTHER",
];

// Supermarket-aisle order, for the shopping list specifically. Distinct
// from CATEGORY_ORDER (used for browsing the pantry): tins/jars and frozen
// sit in different spots since the two screens serve different purposes.
export const SHOPPING_CATEGORY_ORDER: IngredientCategory[] = [
  "PRODUCE",
  "MEAT_FISH",
  "DAIRY",
  "TINS_JARS",
  "DRY_GOODS",
  "BAKING",
  "FROZEN",
  "SPICES",
  "OTHER",
];

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  PRODUCE: "Produce",
  MEAT_FISH: "Meat and fish",
  DAIRY: "Dairy",
  DRY_GOODS: "Dry goods",
  TINS_JARS: "Tins and jars",
  SPICES: "Spices",
  BAKING: "Baking",
  FROZEN: "Frozen",
  OTHER: "Other",
};

// The 3px card bottom-border colour per category, spread across the full
// palette (not shades of one colour) so a category is findable by colour
// alone.
export const CATEGORY_BORDER_CLASS: Record<IngredientCategory, string> = {
  PRODUCE: "border-lime",
  MEAT_FISH: "border-terracotta",
  DAIRY: "border-teal-tint",
  DRY_GOODS: "border-amber",
  TINS_JARS: "border-pink-tint",
  SPICES: "border-amber-tint",
  BAKING: "border-terracotta-tint",
  FROZEN: "border-cream-grey",
  OTHER: "border-green-deep",
};
