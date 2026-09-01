"use server";

import { revalidatePath } from "next/cache";
import type { MealType, Unit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseRecipe, type ParsedRecipeDraft } from "@/lib/import/parseRecipe";
import { resolveIngredientId } from "@/lib/resolveIngredient";
import { serializeInstructions } from "@/lib/instructions";

export type ImportedIngredientRow = ParsedRecipeDraft["ingredients"][number] & {
  matchedIngredientId: string | null;
};

export type ImportPreview = Omit<ParsedRecipeDraft, "ingredients"> & {
  ingredients: ImportedIngredientRow[];
};

// Runs both parser layers and, for each parsed ingredient line, checks it
// against the canonical ingredient catalog (same matcher the scanner uses).
// Nothing is written to the database here.
export async function parseRecipeFromUrl(url: string): Promise<ImportPreview> {
  const draft = await parseRecipe(url);
  const ingredients = await Promise.all(
    draft.ingredients.map(async (ing) => ({
      ...ing,
      matchedIngredientId: await resolveIngredientId(ing.name),
    }))
  );
  return { ...draft, ingredients };
}

export type SaveImportedIngredient = {
  ingredientId: string;
  quantity: number | null;
  unit: Unit | null;
  note: string | null;
};

export type SaveImportedRecipeInput = {
  title: string;
  description: string | null;
  servings: number | null;
  mealType: MealType;
  totalTimeMins: number | null;
  activeTimeMins: number | null;
  imageUrl: string | null;
  source: string;
  steps: { text: string }[];
  ingredients: SaveImportedIngredient[];
};

// The only place an import actually touches the database, and only once
// the user has reviewed and confirmed it on the review screen.
export async function saveImportedRecipe(input: SaveImportedRecipeInput) {
  const recipe = await prisma.recipe.create({
    data: {
      title: input.title,
      description: input.description,
      servings: input.servings,
      mealType: input.mealType,
      totalTimeMins: input.totalTimeMins,
      activeTimeMins: input.activeTimeMins,
      imageUrl: input.imageUrl,
      source: input.source,
      instructions: serializeInstructions(input.steps),
      ingredients: {
        create: input.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
          note: i.note,
        })),
      },
    },
  });

  revalidatePath("/recipes");
  revalidatePath("/what-can-i-make");
  revalidatePath("/shopping-list");
  return recipe;
}
