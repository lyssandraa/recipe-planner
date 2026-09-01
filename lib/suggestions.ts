// Pure arithmetic over data already in the database. No LLM, no scoring
// against targets, just heuristics that nudge toward using up what's
// running low and getting some variety rather than repeating the same
// thing on back-to-back days.

export type SuggestionRecipeInput = {
  ingredientIds: string[];
  lastCookedAt: Date | null;
};

// Higher is better. +5 per required ingredient currently marked LOW
// (cooking this helps use it up before it runs out or goes off).
// A penalty that decays linearly over 14 days for anything cooked
// recently, so the exact same dinner two days running scores worse than
// one not made in a while.
export function computeSuggestionScore(
  recipe: SuggestionRecipeInput,
  lowIngredientIds: Set<string>
): number {
  const lowUsedCount = recipe.ingredientIds.filter((id) => lowIngredientIds.has(id)).length;

  let recencyPenalty = 0;
  if (recipe.lastCookedAt) {
    const daysSince = (Date.now() - recipe.lastCookedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 14) recencyPenalty = 14 - daysSince;
  }

  return lowUsedCount * 5 - recencyPenalty;
}

const EFFORT_WEIGHT: Record<string, number> = { Low: 0, Medium: 1, High: 2 };

// Weekday evenings favour something quick; weekends have no such pressure.
// Not cooked in the last 14 days keeps a suggestion from repeating a
// recent dinner. Ready-to-cook (nothing missing) is required, callers
// should already have filtered for that before calling this.
export function isGoodTodaySuggestion(
  recipe: { effort: string | null; lastCookedAt: Date | null },
  now: Date
): boolean {
  if (recipe.lastCookedAt) {
    const daysSince = (Date.now() - recipe.lastCookedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 14) return false;
  }

  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return true;

  const hour = now.getHours();
  const isEvening = hour >= 16;
  if (!isEvening) return true;

  const weight = recipe.effort ? (EFFORT_WEIGHT[recipe.effort] ?? 1) : 1;
  return weight <= EFFORT_WEIGHT.Medium;
}
