import type { JSX } from "react";
import {
  IconBowl,
  IconCake,
  IconCup,
  IconMeat,
  IconSalad,
  IconSoup,
  IconToolsKitchen2,
} from "@tabler/icons-react";
import type { MealType } from "@prisma/client";

export { getCardColorClass } from "./colorBlock";

const STEW_WORDS = ["braise", "braised", "stew", "soup", "broth", "casserole"];
const MEAT_WORDS = [
  "chicken",
  "beef",
  "pork",
  "lamb",
  "bacon",
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
  stroke?: number;
  className?: string;
};

// Picks a Tabler icon from the recipe's title/ingredients/meal type and
// renders it directly (rather than returning the component reference) so
// callers never assign a runtime-computed component to a variable and use
// it as a JSX tag. Keyword matching over a fixed vocabulary, falling back
// to a generic kitchen icon rather than guessing.
export function renderRecipeIcon(
  recipe: { title: string; mealType: MealType; ingredientNames: string[] },
  props: RecipeIconProps
): JSX.Element {
  const text = [recipe.title, ...recipe.ingredientNames].join(" ").toLowerCase();

  if (recipe.mealType === "DRINK" || matchesAny(text, CUP_WORDS)) return <IconCup {...props} />;
  if (recipe.mealType === "BAKING" || matchesAny(text, CAKE_WORDS))
    return <IconCake {...props} />;
  if (matchesAny(text, STEW_WORDS)) return <IconSoup {...props} />;
  if (matchesAny(text, SALAD_WORDS)) return <IconSalad {...props} />;
  if (matchesAny(text, BOWL_WORDS)) return <IconBowl {...props} />;
  if (matchesAny(text, MEAT_WORDS)) return <IconMeat {...props} />;

  return <IconToolsKitchen2 {...props} />;
}
