// For each required recipe ingredient the pantry doesn't have directly, if
// something the pantry does have satisfies it, that's a substitute worth
// mentioning quietly, e.g. "using unsalted butter" instead of "butter".

export type SatisfiedByCandidate = { id: string; name: string };

export function computeSubstitutions(
  recipeIngredientIds: string[],
  satisfiedByMap: Map<string, SatisfiedByCandidate[]>,
  pantryIngredientIds: Set<string>
): Map<string, string> {
  const result = new Map<string, string>();

  for (const id of recipeIngredientIds) {
    if (pantryIngredientIds.has(id)) continue;

    const candidates = satisfiedByMap.get(id) ?? [];
    const usable = candidates.find((c) => pantryIngredientIds.has(c.id));
    if (usable) result.set(id, usable.name);
  }

  return result;
}
