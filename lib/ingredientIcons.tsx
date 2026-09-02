import type { JSX } from "react";
import type { IngredientCategory } from "@prisma/client";
import { renderCategoryIcon, type CategoryIconProps } from "./categoryIcons";

function matchesAny(name: string, words: string[]): boolean {
  return words.some((w) => name.includes(w));
}

// Ordered, most specific first: a given ingredient name is tested against
// each group in turn and the first match wins, so e.g. "sweet potato" hits
// its own group before the plain "potato" one, and "smoked salmon" hits
// fish before anything more generic could apply. Where Unicode has no
// dedicated emoji for something (celery, flour, black pepper the spice),
// it falls through to the broader category emoji rather than guessing.
const GROUPS: { words: string[]; emoji: string }[] = [
  // Vegetables needing to be checked before a shorter word they contain.
  { words: ["sweet potato", "sweetpotato"], emoji: "🍠" },
  { words: ["watermelon"], emoji: "🍉" },
  { words: ["bell pepper", "capsicum"], emoji: "🫑" },
  { words: ["green bean", "french bean", "runner bean", "mangetout", "sugar snap", "pea"], emoji: "🫛" },

  // Seafood, most specific shellfish first, generic fish last.
  { words: ["shrimp", "prawn"], emoji: "🦐" },
  { words: ["crab"], emoji: "🦀" },
  { words: ["lobster"], emoji: "🦞" },
  { words: ["squid", "calamari"], emoji: "🦑" },
  { words: ["oyster"], emoji: "🦪" },
  { words: ["fish", "salmon", "tuna", "cod", "haddock", "mackerel", "trout", "anchov", "sardine", "tilapia", "bass", "plaice"], emoji: "🐟" },

  // Meat and poultry.
  { words: ["turkey"], emoji: "🦃" },
  { words: ["duck"], emoji: "🦆" },
  { words: ["chicken", "poultry"], emoji: "🍗" },
  { words: ["beef", "steak", "mince", "veal"], emoji: "🥩" },
  { words: ["lamb", "mutton"], emoji: "🐑" },
  { words: ["venison"], emoji: "🦌" },

  // Dairy and eggs.
  { words: ["egg"], emoji: "🥚" },
  { words: ["cheese", "parmesan", "cheddar", "mozzarella", "feta", "brie", "halloumi", "gouda", "ricotta"], emoji: "🧀" },
  { words: ["butter"], emoji: "🧈" },
  { words: ["milk", "cream", "yoghurt", "yogurt", "buttermilk"], emoji: "🥛" },

  // Bread and grains.
  { words: ["bread", "baguette", "bagel", "bun", "roll", "loaf", "toast", "pitta", "tortilla", "naan"], emoji: "🍞" },
  { words: ["rice"], emoji: "🍚" },
  { words: ["pasta", "spaghetti", "noodle", "macaroni", "penne", "lasagne", "lasagna", "tagliatelle", "fusilli"], emoji: "🍝" },

  // Vegetables.
  { words: ["onion", "shallot"], emoji: "🧅" },
  { words: ["garlic"], emoji: "🧄" },
  { words: ["potato"], emoji: "🥔" },
  { words: ["tomato"], emoji: "🍅" },
  { words: ["broccoli"], emoji: "🥦" },
  { words: ["corn", "sweetcorn", "maize"], emoji: "🌽" },
  { words: ["cucumber"], emoji: "🥒" },
  { words: ["aubergine", "eggplant"], emoji: "🍆" },
  { words: ["pepper", "chilli", "chili", "jalape"], emoji: "🌶️" },
  { words: ["ginger"], emoji: "🫚" },
  { words: ["spinach", "kale", "lettuce", "rocket", "chard", "watercress", "cabbage", "pak choi", "bok choy"], emoji: "🥬" },
  { words: ["carrot"], emoji: "🥕" },
  { words: ["mushroom"], emoji: "🍄" },
  { words: ["avocado"], emoji: "🥑" },
  { words: ["olive"], emoji: "🫒" },

  // Fruit.
  { words: ["apple"], emoji: "🍎" },
  { words: ["banana"], emoji: "🍌" },
  { words: ["lemon", "lime"], emoji: "🍋" },
  { words: ["cherry"], emoji: "🍒" },
  { words: ["grape"], emoji: "🍇" },
  { words: ["melon"], emoji: "🍈" },
  { words: ["peach"], emoji: "🍑" },
  { words: ["pear"], emoji: "🍐" },
  { words: ["orange", "clementine", "satsuma", "mandarin"], emoji: "🍊" },
  { words: ["strawberr"], emoji: "🍓" },
  { words: ["blueberr"], emoji: "🫐" },
  { words: ["pineapple"], emoji: "🍍" },
  { words: ["kiwi"], emoji: "🥝" },
  { words: ["mango"], emoji: "🥭" },
  { words: ["coconut"], emoji: "🥥" },

  // Herbs, condiments and store cupboard.
  { words: ["basil", "coriander", "cilantro", "parsley", "thyme", "rosemary", "dill", "chive", "oregano", "tarragon", "mint", "herb"], emoji: "🌿" },
  { words: ["salt"], emoji: "🧂" },
  { words: ["honey"], emoji: "🍯" },
  { words: ["lentil", "chickpea", "garbanzo", "kidney bean", "black bean", "butter bean", "cannellini", "pulse", "bean"], emoji: "🫘" },
  { words: ["peanut", "almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan", "nut"], emoji: "🥜" },
  { words: ["oil", "vinegar"], emoji: "🍶" },
];

export type IngredientIconInput = { name: string; category: IngredientCategory };

// Picks a specific emoji from the ingredient's own name (an apple gets an
// apple, not a generic produce carrot) and only falls back to the broader
// category emoji when nothing more specific matches, e.g. a vegetable
// without a dedicated emoji.
export function getIngredientEmoji(ingredient: IngredientIconInput): string {
  const name = ingredient.name.toLowerCase();
  for (const group of GROUPS) {
    if (matchesAny(name, group.words)) return group.emoji;
  }
  return "";
}

export function renderIngredientIcon(
  ingredient: IngredientIconInput,
  props: CategoryIconProps
): JSX.Element {
  const name = ingredient.name.toLowerCase();

  for (const group of GROUPS) {
    if (matchesAny(name, group.words)) {
      return (
        <span style={{ fontSize: props.size ?? 16, lineHeight: 1 }} className={props.className}>
          {group.emoji}
        </span>
      );
    }
  }

  return renderCategoryIcon(ingredient.category, props);
}
