import type { StockLevel, IngredientCategory } from "@prisma/client";

export const STOCK_LEVELS: StockLevel[] = ["PLENTY", "LOW", "OUT"];

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  PLENTY: "Plenty",
  LOW: "Low",
  OUT: "Out",
};

// Tailwind classes for the stock level toggle, using the theme tokens only.
export function getStockLevelClasses(level: StockLevel, active: boolean): string {
  if (!active) return "bg-card text-text-muted border border-border-soft";
  switch (level) {
    case "PLENTY":
      return "bg-sage-deep text-white";
    case "LOW":
      return "bg-peridot-tint text-olive-text";
    case "OUT":
      return "bg-nav-inactive text-white";
  }
}

export const CATEGORY_ORDER: IngredientCategory[] = [
  "PRODUCE",
  "MEAT_FISH",
  "DAIRY",
  "DRY_GOODS",
  "TINS_JARS",
  "SPICES",
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
  FROZEN: "Frozen",
  OTHER: "Other",
};
