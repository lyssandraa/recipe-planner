import type { Unit } from "@prisma/client";
import { getRequiredIngredients, type MatchIngredient } from "@/lib/matching";

export type ShoppingIngredientInput = MatchIngredient & {
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
};

export type ShoppingRecipeInput = {
  title: string;
  ingredients: ShoppingIngredientInput[];
};

export type ShoppingOccurrence = {
  recipeTitle: string;
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
};

export type MergedShoppingIngredient = {
  ingredientId: string;
  name: string;
  // Set only while every occurrence of this ingredient shares one unit,
  // so the amounts can be safely added together.
  summedQuantity: number | null;
  unit: Unit | null;
  occurrences: ShoppingOccurrence[];
};

// Merges missing (required, not-well-stocked) ingredients across a set of
// recipes, summing quantities per ingredient where units match. Staples
// follow the same low/out override as everywhere else: assumed available
// unless explicitly marked low or out.
export function buildShoppingList(
  recipes: ShoppingRecipeInput[],
  wellStockedIngredientIds: Set<string>,
  lowOrOutIngredientIds: Set<string>
): MergedShoppingIngredient[] {
  const byIngredient = new Map<string, MergedShoppingIngredient>();

  for (const recipe of recipes) {
    const missing = getRequiredIngredients(recipe.ingredients).filter((ri) =>
      ri.isStaple
        ? lowOrOutIngredientIds.has(ri.ingredientId)
        : !wellStockedIngredientIds.has(ri.ingredientId)
    );

    for (const ri of missing) {
      const occurrence: ShoppingOccurrence = {
        recipeTitle: recipe.title,
        quantity: ri.quantity,
        unit: ri.unit,
        note: ri.note,
      };

      const existing = byIngredient.get(ri.ingredientId);
      if (!existing) {
        byIngredient.set(ri.ingredientId, {
          ingredientId: ri.ingredientId,
          name: ri.name,
          summedQuantity: ri.quantity,
          unit: ri.unit,
          occurrences: [occurrence],
        });
        continue;
      }

      existing.occurrences.push(occurrence);

      const canSum =
        existing.summedQuantity != null &&
        ri.quantity != null &&
        existing.unit === ri.unit;
      existing.summedQuantity = canSum
        ? existing.summedQuantity! + ri.quantity!
        : null;
    }
  }

  return Array.from(byIngredient.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}
