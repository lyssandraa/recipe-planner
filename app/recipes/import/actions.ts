"use server";

import { revalidatePath } from "next/cache";
import type { MealType, Unit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseRecipe, type ParsedRecipeDraft } from "@/lib/import/parseRecipe";
import { extractPdfText } from "@/lib/import/pdfText";
import { parseRecipeText } from "@/lib/import/parseRecipeText";
import { resolveIngredientId } from "@/lib/resolveIngredient";
import { serializeInstructions } from "@/lib/instructions";
import { requireAuth } from "@/lib/auth";

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
  await requireAuth();
  const draft = await parseRecipe(url);
  const ingredients = await Promise.all(
    draft.ingredients.map(async (ing) => ({
      ...ing,
      matchedIngredientId: await resolveIngredientId(ing.name),
    }))
  );
  return { ...draft, ingredients };
}

// No structured markup to lean on in a PDF (unlike a recipe website's
// JSON-LD), so this extracts the text layer and runs it through the same
// heading/line heuristics as a plain-text import. Only works for a PDF with
// a real embedded text layer, a scanned/photographed page has none.
export async function parseRecipeFromPdf(formData: FormData): Promise<ImportPreview> {
  await requireAuth();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(buffer);
  if (!text.trim()) {
    throw new Error(
      "Couldn't find any text in that PDF. If it's a scanned or photographed page, there's no text layer to read."
    );
  }

  const fallbackTitle = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "Untitled recipe";
  const draft = parseRecipeText(text, fallbackTitle);
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
  await requireAuth();
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
