"use server";

import { revalidatePath } from "next/cache";
import type {
  ComponentType,
  Cuisine,
  CookMethod,
  IngredientCategory,
  MealType,
  Mood,
  Protein,
  Season,
  Unit,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeInstructions, type RecipeStep } from "@/lib/instructions";
import { guessCategory } from "@/lib/guessCategory";

export type RecipeIngredientInput = {
  ingredientId: string;
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
  optional: boolean;
};

export type RecipeComponentInput = {
  componentRecipeId: string;
  note: string | null;
};

export type RecipeFormInput = {
  title: string;
  description: string | null;
  servings: number | null;
  mealType: MealType;
  componentType: ComponentType | null;
  totalTimeMins: number | null;
  activeTimeMins: number | null;
  batchFriendly: boolean;
  leftoverNote: string | null;
  source: string | null;
  steps: RecipeStep[];
  ingredients: RecipeIngredientInput[];
  cuisines: Cuisine[];
  moods: Mood[];
  proteins: Protein[];
  methods: CookMethod[];
  seasons: Season[];
  components: RecipeComponentInput[];
};

export async function createIngredient(name: string, category?: IngredientCategory) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Ingredient name is required.");
  const ingredient = await prisma.ingredient.create({
    data: { name: trimmed, category: category ?? guessCategory(trimmed) },
  });
  revalidatePath("/pantry");
  return ingredient;
}

// Nested-create blocks shared by createRecipe and updateRecipe for the tag
// dimensions and component links, so the two don't drift out of sync.
function tagAndComponentCreateData(input: RecipeFormInput) {
  return {
    cuisines: { create: input.cuisines.map((value) => ({ value })) },
    moods: { create: input.moods.map((value) => ({ value })) },
    proteins: { create: input.proteins.map((value) => ({ value })) },
    methods: { create: input.methods.map((value) => ({ value })) },
    seasons: { create: input.seasons.map((value) => ({ value })) },
    components: {
      create: input.components.map((c) => ({
        componentRecipeId: c.componentRecipeId,
        note: c.note,
      })),
    },
  };
}

export async function createRecipe(input: RecipeFormInput) {
  const recipe = await prisma.recipe.create({
    data: {
      title: input.title,
      description: input.description,
      servings: input.servings,
      mealType: input.mealType,
      componentType: input.mealType === "COMPONENT" ? input.componentType : null,
      totalTimeMins: input.totalTimeMins,
      activeTimeMins: input.activeTimeMins,
      batchFriendly: input.batchFriendly,
      leftoverNote: input.leftoverNote,
      source: input.source,
      instructions: serializeInstructions(input.steps),
      ingredients: {
        create: input.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
          note: i.note,
          optional: i.optional,
        })),
      },
      ...tagAndComponentCreateData(input),
    },
  });

  revalidatePath("/recipes");
  revalidatePath("/what-can-i-make");
  revalidatePath("/shopping-list");
  return recipe;
}

export async function updateRecipe(id: string, input: RecipeFormInput) {
  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
    prisma.recipeCuisine.deleteMany({ where: { recipeId: id } }),
    prisma.recipeMood.deleteMany({ where: { recipeId: id } }),
    prisma.recipeProtein.deleteMany({ where: { recipeId: id } }),
    prisma.recipeCookMethod.deleteMany({ where: { recipeId: id } }),
    prisma.recipeSeason.deleteMany({ where: { recipeId: id } }),
    prisma.recipeComponent.deleteMany({ where: { parentRecipeId: id } }),
    prisma.recipe.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        servings: input.servings,
        mealType: input.mealType,
        componentType: input.mealType === "COMPONENT" ? input.componentType : null,
        totalTimeMins: input.totalTimeMins,
        activeTimeMins: input.activeTimeMins,
        batchFriendly: input.batchFriendly,
        leftoverNote: input.leftoverNote,
        source: input.source,
        instructions: serializeInstructions(input.steps),
        ingredients: {
          create: input.ingredients.map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unit,
            note: i.note,
            optional: i.optional,
          })),
        },
        ...tagAndComponentCreateData(input),
      },
    }),
  ]);

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/what-can-i-make");
  revalidatePath("/shopping-list");
}

export async function deleteRecipe(id: string) {
  await prisma.recipe.delete({ where: { id } });
  revalidatePath("/recipes");
  revalidatePath("/what-can-i-make");
  revalidatePath("/shopping-list");
}

export async function logCooked(recipeId: string) {
  const entry = await prisma.cookLog.create({ data: { recipeId } });
  revalidatePath(`/recipes/${recipeId}`);
  return entry;
}
