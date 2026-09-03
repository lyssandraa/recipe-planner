import type { IngredientCategory } from "@prisma/client";

// Substring keyword tables, easy to extend: add a word to the relevant
// array. Match is case-insensitive against the full ingredient name.
const CATEGORY_KEYWORDS: Record<Exclude<IngredientCategory, "OTHER">, string[]> = {
  MEAT_FISH: [
    "chicken",
    "beef",
    "lamb",
    "mince",
    "sausage",
    "turkey",
    "duck",
    "salmon",
    "cod",
    "tuna",
    "prawn",
    "fish",
    "steak",
    "thigh",
    "breast",
    "neck",
    "chop",
  ],
  PRODUCE: [
    "onion",
    "garlic",
    "tomato",
    "potato",
    "carrot",
    "celery",
    "pepper",
    "lemon",
    "lime",
    "apple",
    "spinach",
    "cucumber",
    "beetroot",
    "ginger",
    "herb",
    "parsley",
    "coriander",
    "mint",
    "mushroom",
    "courgette",
    "aubergine",
    "leek",
    "cabbage",
    "lettuce",
    "banana",
    "orange",
  ],
  DAIRY: [
    "milk",
    "butter",
    "cheese",
    "yoghurt",
    "yogurt",
    "cream",
    "feta",
    "parmesan",
    "cheddar",
    "mozzarella",
    "egg",
  ],
  DRY_GOODS: [
    "rice",
    "pasta",
    "spaghetti",
    "flour",
    "sugar",
    "oat",
    "lentil",
    "couscous",
    "quinoa",
    "noodle",
    "bread",
    "breadcrumb",
  ],
  TINS_JARS: [
    "tinned",
    "canned",
    "tin of",
    "jar",
    "passata",
    "puree",
    "stock",
    "coconut milk",
    "chickpea",
    "bean",
  ],
  SPICES: [
    "salt",
    "pepper",
    "cumin",
    "coriander seed",
    "paprika",
    "turmeric",
    "cinnamon",
    "cardamom",
    "clove",
    "oregano",
    "thyme",
    "bay",
    "chilli",
    "curry",
    "spice",
    "seasoning",
  ],
  BAKING: [
    "vanilla",
    "chocolate",
    "cocoa",
    "baking powder",
    "baking soda",
    "bicarbonate",
    "yeast",
    "icing",
    "sprinkles",
    "food colouring",
    "food coloring",
    "marzipan",
  ],
  FROZEN: ["frozen", "peas", "ice"],
};

// Category check order, not the order the keyword tables are defined above.
// This is what "more specific before general" actually means in practice:
// TINS_JARS and FROZEN are checked first so a processed or preserved form
// wins over a raw-ingredient word buried in the same name, e.g. "Chicken
// Stock" matches TINS_JARS' "stock" before MEAT_FISH's "chicken" is even
// considered, and "Coconut Milk" matches TINS_JARS before DAIRY's "milk".
const CATEGORY_PRIORITY: Exclude<IngredientCategory, "OTHER">[] = [
  "TINS_JARS",
  "FROZEN",
  "SPICES",
  // Before DRY_GOODS specifically: "icing sugar" should read as baking,
  // not just match DRY_GOODS' plain "sugar" keyword.
  "BAKING",
  "MEAT_FISH",
  "DAIRY",
  "PRODUCE",
  "DRY_GOODS",
];

export function guessCategory(name: string): IngredientCategory {
  const lower = name.toLowerCase();
  for (const category of CATEGORY_PRIORITY) {
    if (CATEGORY_KEYWORDS[category].some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "OTHER";
}
