import { PrismaClient, Unit, MealType, IngredientCategory } from "@prisma/client";

const prisma = new PrismaClient();

// Pantry basics the "what can I make" matcher should always assume are on hand.
// Everything else is a real shopping-list item.
type SeedIngredient = {
  name: string;
  plural?: string;
  isStaple: boolean;
  category: IngredientCategory;
  isHighFibre?: boolean;
  isWholegrain?: boolean;
  isLegume?: boolean;
  isLeafyGreen?: boolean;
  isOilyFish?: boolean;
};

const ingredients: SeedIngredient[] = [
  { name: "Salt", isStaple: true, category: "SPICES" },
  { name: "Black Pepper", isStaple: true, category: "SPICES" },
  { name: "Olive Oil", isStaple: true, category: "DRY_GOODS" },
  { name: "Vegetable Oil", isStaple: true, category: "DRY_GOODS" },
  { name: "Plain Flour", isStaple: true, category: "DRY_GOODS" },
  { name: "Granulated Sugar", isStaple: true, category: "DRY_GOODS" },
  { name: "Butter", isStaple: true, category: "DAIRY" },
  { name: "Unsalted Butter", isStaple: false, category: "DAIRY" },
  { name: "Salted Butter", isStaple: false, category: "DAIRY" },
  { name: "Garlic", plural: "Garlic Cloves", isStaple: false, category: "PRODUCE" },
  { name: "Onion", plural: "Onions", isStaple: false, category: "PRODUCE" },
  { name: "Red Onion", plural: "Red Onions", isStaple: false, category: "PRODUCE" },
  { name: "Chicken Breast", plural: "Chicken Breasts", isStaple: false, category: "MEAT_FISH" },
  { name: "Chicken Thigh", plural: "Chicken Thighs", isStaple: false, category: "MEAT_FISH" },
  { name: "Rice", isStaple: false, category: "DRY_GOODS" },
  { name: "Brown Rice", isStaple: false, category: "DRY_GOODS", isWholegrain: true, isHighFibre: true },
  { name: "Spaghetti", isStaple: false, category: "DRY_GOODS" },
  { name: "Canned Chopped Tomatoes", isStaple: false, category: "TINS_JARS" },
  { name: "Cheddar Cheese", isStaple: false, category: "DAIRY" },
  { name: "Parmesan Cheese", isStaple: false, category: "DAIRY" },
  { name: "Lemon", plural: "Lemons", isStaple: false, category: "PRODUCE" },
  { name: "Egg", plural: "Eggs", isStaple: false, category: "DAIRY" },
  { name: "Milk", isStaple: false, category: "DAIRY" },
  { name: "Cream", isStaple: false, category: "DAIRY" },
  { name: "Single Cream", isStaple: false, category: "DAIRY" },
  { name: "Double Cream", isStaple: false, category: "DAIRY" },
  { name: "Yoghurt", isStaple: false, category: "DAIRY" },
  { name: "Plain Yoghurt", isStaple: false, category: "DAIRY" },
  { name: "Fresh Ginger", isStaple: false, category: "PRODUCE" },
  { name: "Spinach", isStaple: false, category: "PRODUCE", isLeafyGreen: true, isHighFibre: true },
  { name: "Kale", isStaple: false, category: "PRODUCE", isLeafyGreen: true, isHighFibre: true },
  { name: "Chickpeas", isStaple: false, category: "TINS_JARS", isLegume: true, isHighFibre: true },
  { name: "Lentils", isStaple: false, category: "DRY_GOODS", isLegume: true, isHighFibre: true },
  { name: "Salmon", plural: "Salmon Fillets", isStaple: false, category: "MEAT_FISH", isOilyFish: true },
  { name: "Wholemeal Bread", isStaple: false, category: "DRY_GOODS", isWholegrain: true, isHighFibre: true },
];

// "Satisfies" relations: having the ingredient on the left means the
// ingredient on the right doesn't need to be shopped for or matched
// separately, e.g. having unsalted butter means "butter" is covered.
// Distinct from a synonym: these are genuinely different things where one
// can stand in for the other, not two names for the same thing.
const satisfiesPairs: [string, string][] = [
  ["Unsalted Butter", "Butter"],
  ["Salted Butter", "Butter"],
  ["Red Onion", "Onion"],
  ["Single Cream", "Cream"],
  ["Double Cream", "Cream"],
  ["Plain Yoghurt", "Yoghurt"],
];

async function main() {
  const byName = new Map<string, string>(); // ingredient name -> id

  for (const ing of ingredients) {
    const tags = {
      isHighFibre: ing.isHighFibre ?? false,
      isWholegrain: ing.isWholegrain ?? false,
      isLegume: ing.isLegume ?? false,
      isLeafyGreen: ing.isLeafyGreen ?? false,
      isOilyFish: ing.isOilyFish ?? false,
    };
    const record = await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: { plural: ing.plural, isStaple: ing.isStaple, category: ing.category, ...tags },
      create: { name: ing.name, plural: ing.plural, isStaple: ing.isStaple, category: ing.category, ...tags },
    });
    byName.set(ing.name, record.id);
  }

  const id = (name: string): string => {
    const found = byName.get(name);
    if (!found) throw new Error(`Seed ingredient missing: ${name}`);
    return found;
  };

  for (const [fromName, toName] of satisfiesPairs) {
    await prisma.ingredient.update({
      where: { id: id(fromName) },
      data: { satisfies: { connect: { id: id(toName) } } },
    });
  }

  await prisma.recipe.create({
    data: {
      title: "Garlic Butter Chicken Thighs with Rice",
      description:
        "Pan-seared chicken thighs finished in garlic butter, served over rice.",
      servings: 4,
      instructions: JSON.stringify([
        { text: "Cook the rice according to packet instructions.", timerSeconds: 900 },
        { text: "Season the chicken thighs with salt and pepper." },
        { text: "Heat the olive oil in a large pan over medium-high heat and sear the chicken thighs, skin side down, until golden.", timerSeconds: 360 },
        { text: "Flip the chicken, add the butter and garlic to the pan, and cook until the chicken is cooked through, spooning the garlic butter over it occasionally.", timerSeconds: 480 },
        { text: "Squeeze the lemon juice over the chicken just before serving with the rice." },
      ]),
      totalTimeMins: 35,
      activeTimeMins: 25,
      batchFriendly: false,
      mealType: MealType.DINNER,
      source: "Family recipe",
      ingredients: {
        create: [
          { ingredientId: id("Chicken Thigh"), quantity: 600, unit: Unit.g, note: "boneless, skin on" },
          { ingredientId: id("Garlic"), quantity: 4, unit: Unit.piece, note: "minced" },
          { ingredientId: id("Butter"), quantity: 30, unit: Unit.g },
          { ingredientId: id("Olive Oil"), quantity: 1, unit: Unit.tbsp },
          { ingredientId: id("Rice"), quantity: 300, unit: Unit.g },
          { ingredientId: id("Salt"), quantity: 1, unit: Unit.tsp },
          { ingredientId: id("Black Pepper"), note: "to taste", optional: true },
          { ingredientId: id("Lemon"), quantity: 1, unit: Unit.piece, note: "juiced", optional: true },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      title: "Tomato Spaghetti with Parmesan",
      description: "A quick weeknight tomato and garlic spaghetti.",
      servings: 3,
      instructions: JSON.stringify([
        { text: "Bring a large pot of salted water to the boil and cook the spaghetti until al dente.", timerSeconds: 540 },
        { text: "Meanwhile, heat the olive oil in a pan over medium heat and cook the garlic until fragrant.", timerSeconds: 60 },
        { text: "Add the chopped tomatoes, season with salt and pepper, and simmer.", timerSeconds: 600 },
        { text: "Drain the spaghetti and toss through the sauce." },
        { text: "Serve topped with grated Parmesan." },
      ]),
      totalTimeMins: 25,
      activeTimeMins: 15,
      batchFriendly: true,
      leftoverNote: "Keeps well in the fridge for 2 days, reheat with a splash of water.",
      mealType: MealType.DINNER,
      source: "https://example.com/recipes/tomato-spaghetti",
      ingredients: {
        create: [
          { ingredientId: id("Spaghetti"), quantity: 400, unit: Unit.g },
          { ingredientId: id("Canned Chopped Tomatoes"), quantity: 2, unit: Unit.piece, note: "400g cans" },
          { ingredientId: id("Garlic"), quantity: 2, unit: Unit.piece, note: "sliced" },
          { ingredientId: id("Olive Oil"), quantity: 2, unit: Unit.tbsp },
          { ingredientId: id("Salt") },
          { ingredientId: id("Black Pepper") },
          { ingredientId: id("Parmesan Cheese"), quantity: 30, unit: Unit.g, note: "grated", optional: true },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      title: "Slow-Braised Chicken and Rice",
      description:
        "Chicken breast browned and braised low and slow with rice, onion and cheddar. Mostly hands-off oven time.",
      servings: 4,
      instructions: JSON.stringify([
        { text: "Preheat the oven to 150C (300F)." },
        { text: "Season the chicken breasts with salt and pepper." },
        { text: "Heat the vegetable oil in an ovenproof pan and brown the chicken on both sides, then set aside.", timerSeconds: 480 },
        { text: "In the same pan, soften the onion and garlic.", timerSeconds: 300 },
        { text: "Stir in the rice, nestle the chicken back on top, and pour in the milk." },
        { text: "Cover and braise in the oven, undisturbed.", timerSeconds: 12600 },
        { text: "Scatter the cheddar over the top and return to the oven, uncovered, until melted.", timerSeconds: 300 },
      ]),
      totalTimeMins: 240,
      activeTimeMins: 40,
      batchFriendly: true,
      leftoverNote: "Reheats well in the microwave; add a splash of water so the rice doesn't dry out.",
      mealType: MealType.DINNER,
      source: "Family recipe",
      ingredients: {
        create: [
          { ingredientId: id("Chicken Breast"), quantity: 500, unit: Unit.g },
          { ingredientId: id("Onion"), quantity: 1, unit: Unit.piece, note: "sliced" },
          { ingredientId: id("Garlic"), quantity: 2, unit: Unit.piece, note: "minced" },
          { ingredientId: id("Rice"), quantity: 250, unit: Unit.g },
          { ingredientId: id("Vegetable Oil"), quantity: 1, unit: Unit.tbsp },
          { ingredientId: id("Milk"), quantity: 100, unit: Unit.ml },
          { ingredientId: id("Cheddar Cheese"), quantity: 80, unit: Unit.g, note: "grated", optional: true },
          { ingredientId: id("Salt") },
          { ingredientId: id("Black Pepper") },
        ],
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
