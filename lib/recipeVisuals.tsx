import type { JSX } from "react";
import type { MealType } from "@prisma/client";

export { getCardColorClass } from "./colorBlock";

const STEW_WORDS = ["braise", "braised", "stew", "soup", "broth", "casserole"];
const MEAT_WORDS = [
  "chicken",
  "beef",
  "lamb",
  "sausage",
  "turkey",
  "meat",
  "mince",
];
const BOWL_WORDS = ["pasta", "spaghetti", "rice", "noodle", "risotto", "curry"];
const SALAD_WORDS = ["salad"];
const CAKE_WORDS = ["cake", "bake", "cookie", "muffin", "bread", "pastry", "dessert"];
const CUP_WORDS = ["smoothie", "drink", "juice", "shake", "cocktail", "tea", "coffee"];

function matchesAny(haystack: string, words: string[]): boolean {
  return words.some((w) => haystack.includes(w));
}

export type RecipeIconProps = {
  size?: number;
  className?: string;
};

// Picks an emoji from the recipe's title/ingredients/meal type. Keyword
// matching over a fixed vocabulary, falling back to a generic plate emoji
// rather than guessing.
export function getRecipeEmoji(recipe: {
  title: string;
  mealType: MealType;
  ingredientNames: string[];
}): string {
  const text = [recipe.title, ...recipe.ingredientNames].join(" ").toLowerCase();

  if (recipe.mealType === "DRINK" || matchesAny(text, CUP_WORDS)) return "🥤";
  if (recipe.mealType === "BAKING" || matchesAny(text, CAKE_WORDS)) return "🍰";
  if (matchesAny(text, STEW_WORDS)) return "🍲";
  if (matchesAny(text, SALAD_WORDS)) return "🥗";
  if (matchesAny(text, BOWL_WORDS)) return "🍜";
  if (matchesAny(text, MEAT_WORDS)) return "🍖";

  return "🍽️";
}

export function renderRecipeIcon(
  recipe: { title: string; mealType: MealType; ingredientNames: string[] },
  props: RecipeIconProps
): JSX.Element {
  return (
    <span style={{ fontSize: props.size ?? 18, lineHeight: 1 }} className={props.className}>
      {getRecipeEmoji(recipe)}
    </span>
  );
}

export const MEAL_TYPE_EMOJI: Record<MealType, string> = {
  BREAKFAST: "🍳",
  LUNCH: "🥪",
  DINNER: "🍽️",
  SNACK: "🍎",
  DRINK: "🥤",
  BAKING: "🧁",
  SIDE: "🥔",
  SAUCE_CONDIMENT: "🍯",
  COMPONENT: "🫙",
  OTHER: "🍴",
};
