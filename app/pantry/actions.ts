"use server";

import { revalidatePath } from "next/cache";
import type { IngredientCategory, StockLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { guessCategory } from "@/lib/guessCategory";
import { requireAuth } from "@/lib/auth";

function revalidateShoppingSurfaces() {
  revalidatePath("/pantry");
  revalidatePath("/what-can-i-make");
  revalidatePath("/shopping-list");
  revalidatePath("/");
}

// Keeps the shopping list in sync with stock level the moment it changes,
// rather than waiting for a visit to the shopping list page to notice:
// OUT adds a low-stock suggestion to the main list, PLENTY or LOW removes
// it again (unless it's already ticked, ticking something off is never
// silently undone). LOW alone never adds to the main list, it only shows
// in the shopping list's "Might need soon" section, which reads pantry
// state live rather than being stored as a row here.
export async function setStockLevel(ingredientId: string, level: StockLevel) {
  await requireAuth();
  await prisma.pantryItem.upsert({
    where: { ingredientId },
    update: { stockLevel: level },
    create: { ingredientId, stockLevel: level },
  });

  if (level === "OUT") {
    const ingredient = await prisma.ingredient.findUniqueOrThrow({
      where: { id: ingredientId },
    });
    await prisma.shoppingListItem.upsert({
      where: { ingredientId_origin: { ingredientId, origin: "LOW_STOCK" } },
      update: {},
      create: { name: ingredient.name, origin: "LOW_STOCK", ingredientId },
    });
  } else {
    const existing = await prisma.shoppingListItem.findUnique({
      where: { ingredientId_origin: { ingredientId, origin: "LOW_STOCK" } },
    });
    if (existing && !existing.checked) {
      await prisma.shoppingListItem.delete({ where: { id: existing.id } });
    }
  }

  revalidateShoppingSurfaces();
}

export async function createPantryIngredient(name: string, category?: IngredientCategory) {
  await requireAuth();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Ingredient name is required.");

  // Appended past the current highest sortOrder so a newly added ingredient
  // lands at the end of its category group, not the top.
  const highest = await prisma.ingredient.aggregate({ _max: { sortOrder: true } });

  const ingredient = await prisma.ingredient.create({
    data: {
      name: trimmed,
      category: category ?? guessCategory(trimmed),
      sortOrder: (highest._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/pantry");
  return ingredient;
}

// Persists a new manual order for a set of ingredients (a pantry category
// group, or the staples list) as sequential integers, so the up/down
// controls just send the reordered id list rather than computing swapped
// values themselves.
export async function reorderIngredients(orderedIds: string[]) {
  await requireAuth();
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.ingredient.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/pantry");
}

export async function updateIngredientCategory(
  ingredientId: string,
  category: IngredientCategory
) {
  await requireAuth();
  await prisma.ingredient.update({ where: { id: ingredientId }, data: { category } });
  revalidatePath("/pantry");
}

// Replaces the full set of ingredients this one can stand in for, e.g.
// setting "Unsalted Butter" to satisfy ["Butter"] means having unsalted
// butter well stocked covers "butter" too, in matching and shopping lists.
export async function setIngredientSatisfies(ingredientId: string, satisfiesIds: string[]) {
  await requireAuth();
  await prisma.ingredient.update({
    where: { id: ingredientId },
    data: { satisfies: { set: satisfiesIds.map((id) => ({ id })) } },
  });
  revalidateShoppingSurfaces();
}

// Empty clears the override, reverting to the static lookup (or nothing).
export async function updateIngredientStorageAdvice(
  ingredientId: string,
  advice: string | null
) {
  await requireAuth();
  await prisma.ingredient.update({
    where: { id: ingredientId },
    data: { storageAdvice: advice?.trim() || null },
  });
  revalidatePath("/pantry");
}
