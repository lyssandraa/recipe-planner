// Shared "do I have this?" logic used by both the What Can I Make screen
// and the shopping list, so the two never disagree about what counts as missing.

export type MatchIngredient = {
  ingredientId: string;
  name: string;
  isStaple: boolean;
  optional: boolean;
};

// Ingredients that must be on hand for a recipe to be makeable: not marked
// optional. Staples are handled separately in getMissingIngredients, since
// they're usually assumed available but can be overridden by stock level.
export function getRequiredIngredients<T extends MatchIngredient>(
  ingredients: T[]
): T[] {
  return ingredients.filter((i) => !i.optional);
}

// An ingredient counts as missing if:
// - it's a staple that has been explicitly marked low or out, or
// - it's a non-staple that isn't stocked at full (PLENTY) level.
// A staple with no pantry record at all is still assumed available, that's
// the whole point of marking something a staple.
export function getMissingIngredients<T extends MatchIngredient>(
  ingredients: T[],
  wellStockedIngredientIds: Set<string>,
  lowOrOutIngredientIds: Set<string>
): T[] {
  return getRequiredIngredients(ingredients).filter((i) => {
    if (i.isStaple) return lowOrOutIngredientIds.has(i.ingredientId);
    return !wellStockedIngredientIds.has(i.ingredientId);
  });
}
