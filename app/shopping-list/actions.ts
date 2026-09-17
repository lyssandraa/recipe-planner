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

// Appended past the current highest sortOrder so a newly added row lands
// at the end of its category group, not the top. Shared by every create
// path (manual add, recipe sync, low-stock promote).
async function nextSortOrder(): Promise<number> {
  const highest = await prisma.shoppingListItem.aggregate({ _max: { sortOrder: true } });
  return (highest._max.sortOrder ?? 0) + 1;
}

export type MightNeedSoonItem = {
  ingredientId: string;
  name: string;
};

export async function getShoppingListItems(): Promise<ShoppingListItemData[]> {
  const rows = await prisma.shoppingListItem.findMany({
    orderBy: [{ checked: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
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
    create: { name: ingredient.name, origin: "LOW_STOCK", ingredientId, sortOrder: await nextSortOrder() },
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
// Shared by syncShoppingList and the planner's "send missing to shopping
// list": resolves a set of recipe ids into buildShoppingList's input shape,
// each contributing its own ingredients plus, separately, the ingredients
// of every component it links to (a marinade, a sauce...) under that
// component's own title, so pulling in a braise also shops for its
// marinade without duplicating it into the braise's own ingredient list.
async function mergeMissingIngredients(recipeIds: string[]) {
  const { wellStocked, lowOrOut } = await getPantryStockSets();

  const recipes =
    recipeIds.length > 0
      ? await prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
          include: {
            ingredients: { include: { ingredient: true } },
            components: {
              include: {
                component: { include: { ingredients: { include: { ingredient: true } } } },
              },
            },
          },
        })
      : [];

  function toMergeInput(title: string, ingredients: (typeof recipes)[number]["ingredients"]) {
    return {
      title,
      ingredients: ingredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        isStaple: ri.ingredient.isStaple,
        optional: ri.optional,
        quantity: ri.quantity,
        unit: ri.unit,
        note: ri.note,
      })),
    };
  }

  const forMerge = recipes.flatMap((r) => [
    toMergeInput(r.title, r.ingredients),
    ...r.components.map((link) => toMergeInput(link.component.title, link.component.ingredients)),
  ]);

  return buildShoppingList(forMerge, wellStocked, lowOrOut);
}

export async function syncShoppingList(
  selectedRecipeIds: string[]
): Promise<ShoppingListItemData[]> {
  const merged = await mergeMissingIngredients(selectedRecipeIds);
  const mergedIds = new Set(merged.map((m) => m.ingredientId));

  // A single base value shared across this sync's new rows, incremented
  // locally rather than re-queried per row, so a sync that adds several
  // ingredients at once doesn't tie them all at the same sortOrder.
  let nextNewSortOrder = await nextSortOrder();

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
        sortOrder: nextNewSortOrder++,
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
      sortOrder: await nextSortOrder(),
    },
  });

  revalidatePath("/shopping-list");
  return getShoppingListItems();
}

// Persists a new manual order for a category group of to-buy items as
// sequential integers, mirroring the pantry's reorderIngredients.
export async function reorderShoppingItems(orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.shoppingListItem.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/shopping-list");
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

// Logs a ShoppingTrip snapshot before deleting, so the monthly tracker has
// something to look back on even though the list rows themselves don't
// survive being bought. totalSpent is optional, a trip is still worth
// recording (date, item count) even when nobody types in an amount.
export async function clearTickedItems(totalSpent: number | null = null) {
  const ticked = await prisma.shoppingListItem.findMany({
    where: { checked: true },
    select: { name: true },
  });

  if (ticked.length > 0) {
    await prisma.shoppingTrip.create({
      data: {
        totalSpent,
        itemCount: ticked.length,
        itemNames: ticked.map((i) => i.name),
      },
    });
  }

  await prisma.shoppingListItem.deleteMany({ where: { checked: true } });
  revalidatePath("/shopping-list");
  revalidatePath("/shopping-list/tracker");
  return getShoppingListItems();
}

export type ShoppingTripData = {
  id: string;
  date: string;
  totalSpent: number | null;
  itemCount: number;
  itemNames: string[];
};

export type MonthlyShoppingSummary = {
  trips: ShoppingTripData[];
  totalSpent: number;
  // Trips actually priced, distinct from trips.length, since totalSpent is
  // optional per trip, "average" should divide by what's actually known.
  tripsWithSpend: number;
  totalItems: number;
};

export async function getShoppingTripsForMonth(monthStart: Date): Promise<MonthlyShoppingSummary> {
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  const rows = await prisma.shoppingTrip.findMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
    orderBy: { date: "desc" },
  });

  const trips: ShoppingTripData[] = rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    totalSpent: r.totalSpent,
    itemCount: r.itemCount,
    itemNames: Array.isArray(r.itemNames) ? (r.itemNames as string[]) : [],
  }));

  const priced = trips.filter((t) => t.totalSpent != null);

  return {
    trips,
    totalSpent: priced.reduce((sum, t) => sum + (t.totalSpent ?? 0), 0),
    tripsWithSpend: priced.length,
    totalItems: trips.reduce((sum, t) => sum + t.itemCount, 0),
  };
}

// Used by the planner's "send this week's missing ingredients" action.
// Deliberately additive, unlike syncShoppingList: it only ever upserts,
// never deletes a RECIPE row for a recipe that isn't in this set, since
// that set here is "this week's dinners", not the shopping list's own
// independent recipe selection, wiping the latter would be a surprising
// side effect of planning a week.
export async function addRecipesToShoppingList(recipeIds: string[]): Promise<number> {
  const merged = await mergeMissingIngredients(recipeIds);
  let nextNewSortOrder = await nextSortOrder();
  let added = 0;

  for (const m of merged) {
    const quantityText =
      m.summedQuantity != null ? formatQuantityUnit(m.summedQuantity, m.unit) : null;
    const existing = await prisma.shoppingListItem.findUnique({
      where: { ingredientId_origin: { ingredientId: m.ingredientId, origin: "RECIPE" } },
    });
    await prisma.shoppingListItem.upsert({
      where: { ingredientId_origin: { ingredientId: m.ingredientId, origin: "RECIPE" } },
      update: { name: m.name, quantityText },
      create: {
        name: m.name,
        quantityText,
        origin: "RECIPE",
        ingredientId: m.ingredientId,
        sortOrder: nextNewSortOrder++,
      },
    });
    if (!existing) added++;
  }

  revalidatePath("/shopping-list");
  return added;
}
