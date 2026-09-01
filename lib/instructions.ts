export type RecipeStep = {
  text: string;
  timerSeconds?: number;
  // Ingredients this step uses, so cook mode and the detail page can show
  // amounts right under the step instead of making you scroll back up.
  // Set by the ingredient picker in the edit form; for older recipes with
  // no links yet, inferStepIngredientIds falls back to name matching.
  ingredientIds?: string[];
};

export function parseInstructions(raw: string): RecipeStep[] {
  return JSON.parse(raw);
}

export function serializeInstructions(steps: RecipeStep[]): string {
  return JSON.stringify(steps);
}

export function formatTimer(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// Used when a step has no explicit ingredientIds (every recipe written
// before this feature existed): checks which of the recipe's own
// ingredient names appear in the step text. Longer names are checked
// first so "chicken thigh" matches before a looser "chicken" would.
export function inferStepIngredientIds(
  stepText: string,
  ingredients: { id: string; name: string }[]
): string[] {
  const lower = stepText.toLowerCase();
  return ingredients
    .filter((i) => i.name.length >= 3)
    .sort((a, b) => b.name.length - a.name.length)
    .filter((i) => lower.includes(i.name.toLowerCase()))
    .map((i) => i.id);
}

export function getStepIngredientIds(
  step: RecipeStep,
  ingredients: { id: string; name: string }[]
): string[] {
  return step.ingredientIds && step.ingredientIds.length > 0
    ? step.ingredientIds
    : inferStepIngredientIds(step.text, ingredients);
}
