"use server";

import { revalidatePath } from "next/cache";
import type { IngredientCategory, MealType, Unit } from "@prisma/client";
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

export type RecipeFormInput = {
  title: string;
  description: string | null;
  servings: number | null;
  mealType: MealType;
  totalTimeMins: number | null;
  activeTimeMins: number | null;
  batchFriendly: boolean;
  leftoverNote: string | null;
  source: string | null;
  steps: RecipeStep[];
  ingredients: RecipeIngredientInput[];
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

export async function createRecipe(input: RecipeFormInput) {
  const recipe = await prisma.recipe.create({
    data: {
      title: input.title,
      description: input.description,
      servings: input.servings,
      mealType: input.mealType,
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
    prisma.recipe.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        servings: input.servings,
        mealType: input.mealType,
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
