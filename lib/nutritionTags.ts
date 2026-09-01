// Descriptive-only nudges: no calorie counting, no scores, no targets, no
// judgement about what was eaten. Just facts about which tags showed up
// in what got cooked, derived entirely from CookLog and Ingredient tags.

export const NUTRITION_TAGS = [
  "isHighFibre",
  "isWholegrain",
  "isLegume",
  "isLeafyGreen",
  "isOilyFish",
] as const;

export type NutritionTag = (typeof NUTRITION_TAGS)[number];

export const NUTRITION_TAG_LABELS: Record<NutritionTag, string> = {
  isHighFibre: "high fibre",
  isWholegrain: "wholegrain",
  isLegume: "legumes",
  isLeafyGreen: "leafy greens",
  isOilyFish: "oily fish",
};

export type TagFlags = Record<NutritionTag, boolean>;

export type WeeklyTagSummary = {
  totalCooked: number;
  tagCounts: Record<NutritionTag, number>;
  // The tag that showed up least often among dinners cooked this week.
  // Null when nothing was cooked, there's nothing to describe.
  lightestTag: NutritionTag | null;
};

// Each entry in cookedRecipesIngredientTags is one cooked dinner's list of
// ingredient tag flags. A dinner "had" a tag if any of its ingredients
// carry it.
export function summarizeWeeklyTags(
  cookedRecipesIngredientTags: TagFlags[][]
): WeeklyTagSummary {
  const totalCooked = cookedRecipesIngredientTags.length;
  const tagCounts = Object.fromEntries(NUTRITION_TAGS.map((t) => [t, 0])) as Record<
    NutritionTag,
    number
  >;

  for (const ingredientTags of cookedRecipesIngredientTags) {
    for (const tag of NUTRITION_TAGS) {
      if (ingredientTags.some((t) => t[tag])) tagCounts[tag] += 1;
    }
  }

  let lightestTag: NutritionTag | null = null;
  if (totalCooked > 0) {
    lightestTag = NUTRITION_TAGS.reduce((lightest, tag) =>
      tagCounts[tag] < tagCounts[lightest] ? tag : lightest
    );
  }

  return { totalCooked, tagCounts, lightestTag };
}
