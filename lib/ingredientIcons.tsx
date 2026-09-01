import type { JSX } from "react";
import {
  IconApple,
  IconAvocado,
  IconBanana,
  IconBottle,
  IconBread,
  IconCarrot,
  IconCheese,
  IconCherry,
  IconEgg,
  IconFish,
  IconGrape,
  IconLeaf,
  IconLemon,
  IconMelon,
  IconMilk,
  IconMushroom,
  IconPepper,
  IconPig,
  IconSalt,
} from "@tabler/icons-react";
import type { IngredientCategory } from "@prisma/client";
import { renderCategoryIcon, type CategoryIconProps } from "./categoryIcons";

function matchesAny(name: string, words: string[]): boolean {
  return words.some((w) => name.includes(w));
}

// Ordered, most specific first: a given ingredient name is tested against
// each group in turn and the first match wins, so e.g. "smoked salmon"
// hits fish before anything more generic could apply.
const GROUPS: { words: string[]; Icon: typeof IconCarrot }[] = [
  { words: ["fish", "salmon", "tuna", "cod", "prawn", "shrimp", "haddock", "mackerel", "trout", "anchov"], Icon: IconFish },
  { words: ["pork", "bacon", "ham", "sausage", "gammon"], Icon: IconPig },
  { words: ["egg"], Icon: IconEgg },
  { words: ["cheese", "parmesan", "cheddar", "mozzarella", "feta", "brie", "halloumi"], Icon: IconCheese },
  { words: ["milk", "cream", "yoghurt", "yogurt"], Icon: IconMilk },
  { words: ["bread", "baguette", "bagel", "bun", "roll", "loaf"], Icon: IconBread },
  { words: ["spinach", "kale", "lettuce", "rocket", "chard", "watercress", "cabbage"], Icon: IconLeaf },
  { words: ["apple"], Icon: IconApple },
  { words: ["banana"], Icon: IconBanana },
  { words: ["lemon", "lime"], Icon: IconLemon },
  { words: ["cherry"], Icon: IconCherry },
  { words: ["grape"], Icon: IconGrape },
  { words: ["melon"], Icon: IconMelon },
  { words: ["avocado"], Icon: IconAvocado },
  { words: ["mushroom"], Icon: IconMushroom },
  { words: ["carrot"], Icon: IconCarrot },
  { words: ["pepper", "chilli", "chili"], Icon: IconPepper },
  { words: ["salt"], Icon: IconSalt },
  { words: ["oil", "vinegar"], Icon: IconBottle },
];

export type IngredientIconInput = { name: string; category: IngredientCategory };

// Picks a specific icon from the ingredient's own name (an apple gets an
// apple, not a generic produce carrot) and only falls back to the broader
// category icon when nothing more specific matches, e.g. a vegetable
// without a dedicated Tabler icon.
export function renderIngredientIcon(
  ingredient: IngredientIconInput,
  props: CategoryIconProps
): JSX.Element {
  const name = ingredient.name.toLowerCase();

  for (const group of GROUPS) {
    if (matchesAny(name, group.words)) {
      const Icon = group.Icon;
      return <Icon {...props} />;
    }
  }

  return renderCategoryIcon(ingredient.category, props);
}
