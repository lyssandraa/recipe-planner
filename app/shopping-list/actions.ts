"use server";

import { revalidatePath } from "next/cache";
import type { IngredientCategory, ShoppingItemOrigin } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildShoppingList } from "@/lib/shopping";
import { formatQuantityUnit } from "@/lib/units";
import { getPantryStockSets } from "@/lib/pantryStock";

export type ShoppingListItemData = {
  id: string;
  name: string;
  quantityText: string | null;
  overrideQuantityText: string | null;
  origin: ShoppingItemOrigin;
  checked: boolean;
  ingredientId: string | null;
  // Null for a manual item that never resolved to a canonical ingredient,
  // grouped under "Other" on the shopping list.
  category: IngredientCategory | null;
};

export type MightNeedSoonItem = {
  ingredientId: string;
  name: string;
};

export async function getShoppingListItems(): Promise<ShoppingListItemData[]> {
  const rows = await prisma.shoppingListItem.findMany({
    orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
    include: { ingredient: { select: { category: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    quantityText: r.quantityText,
    overrideQuantityText: r.overrideQuantityText,
    origin: r.origin,
    checked: r.checked,
    ingredientId: r.ingredientId,
    category: r.ingredient?.category ?? null,
  }));
}

// Ingredients marked LOW that aren't already on the main list some other
// way (promoted, needed by a selected recipe, or a leftover OUT row).
// Read live from pantry state rather than stored, since nothing needs to
// persist until it's actually promoted.
export async function getMightNeedSoon(): Promise<MightNeedSoonItem[]> {
  const [lowItems, listedIngredientIds] = await Promise.all([
    prisma.pantryItem.findMany({
      where: { stockLevel: "LOW" },
      include: { ingredient: { select: { id: true, name: true } } },
    }),
    prisma.shoppingListItem.findMany({
      where: { ingredientId: { not: null } },
      select: { ingredientId: true },
    }),
  ]);

  const alreadyListed = new Set(listedIngredientIds.map((i) => i.ingredientId));

  return lowItems
    .filter((p) => !alreadyListed.has(p.ingredientId))
    .map((p) => ({ ingredientId: p.ingredient.id, name: p.ingredient.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function promoteLowStockItem(ingredientId: string): Promise<ShoppingListItemData[]> {
  const ingredient = await prisma.ingredient.findUniqueOrThrow({ where: { id: ingredientId } });
  await prisma.shoppingListItem.upsert({
    where: { ingredientId_origin: { ingredientId, origin: "LOW_STOCK" } },
    update: {},
    create: { name: ingredient.name, origin: "LOW_STOCK", ingredientId },
  });
  revalidatePath("/shopping-list");
  return getShoppingListItems();
}

// Keeps the persisted list in sync with the currently selected recipes.
// Recipe-derived rows are upserted by ingredient, never duplicated;
// unchecked rows that are no longer relevant are removed. Checked rows are
// always left alone, ticking something off is never silently undone by a
// resync. Low-stock rows are managed entirely by the pantry screen (added
// the moment something goes OUT, removed the moment it doesn't) and by
// promoting a "Might need soon" item, this function doesn't touch them at
// all, it would otherwise have no way to tell "auto-added because OUT" and
// "promoted on purpose while still LOW" apart.
export async function syncShoppingList(
  selectedRecipeIds: string[]
): Promise<ShoppingListItemData[]> {
  const { wellStocked, lowOrOut } = await getPantryStockSets();

  const recipes =
    selectedRecipeIds.length > 0
      ? await prisma.recipe.findMany({
          where: { id: { in: selectedRecipeIds } },
          include: { ingredients: { include: { ingredient: true } } },
        })
      : [];

  const forMerge = recipes.map((r) => ({
    title: r.title,
    ingredients: r.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      isStaple: ri.ingredient.isStaple,
      optional: ri.optional,
      quantity: ri.quantity,
      unit: ri.unit,
      note: ri.note,
    })),
  }));

  const merged = buildShoppingList(forMerge, wellStocked, lowOrOut);
  const mergedIds = new Set(merged.map((m) => m.ingredientId));

  for (const m of merged) {
    const quantityText =
      m.summedQuantity != null ? formatQuantityUnit(m.summedQuantity, m.unit) : null;
    await prisma.shoppingListItem.upsert({
      where: { ingredientId_origin: { ingredientId: m.ingredientId, origin: "RECIPE" } },
      update: { name: m.name, quantityText },
      create: {
        name: m.name,
        quantityText,
        origin: "RECIPE",
        ingredientId: m.ingredientId,
      },
    });
  }

  const staleRecipeRows = await prisma.shoppingListItem.findMany({
    where: {
      origin: "RECIPE",
      checked: false,
      ingredientId: { notIn: merged.length > 0 ? Array.from(mergedIds) : [] },
    },
  });
  if (staleRecipeRows.length > 0) {
    await prisma.shoppingListItem.deleteMany({
      where: { id: { in: staleRecipeRows.map((r) => r.id) } },
    });
  }

  return getShoppingListItems();
}

export async function addManualItem(name: string, quantityText: string | null) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name is required.");

  await prisma.shoppingListItem.create({
    data: {
      name: trimmed,
      quantityText: quantityText?.trim() || null,
      origin: "MANUAL",
    },
  });

  revalidatePath("/shopping-list");
  return getShoppingListItems();
}

// Setting a value overrides the display quantity without touching the
// recipe-derived quantityText underneath. Passing null clears the override,
// reverting to whatever quantityText currently computes to.
export async function setItemQuantityOverride(id: string, overrideQuantityText: string | null) {
  await prisma.shoppingListItem.update({
    where: { id },
    data: { overrideQuantityText: overrideQuantityText?.trim() || null },
  });
  revalidatePath("/shopping-list");
}

export async function toggleShoppingItemChecked(id: string, checked: boolean) {
  await prisma.shoppingListItem.update({ where: { id }, data: { checked } });
  revalidatePath("/shopping-list");
}

export async function clearTickedItems() {
  await prisma.shoppingListItem.deleteMany({ where: { checked: true } });
  revalidatePath("/shopping-list");
  return getShoppingListItems();
}
