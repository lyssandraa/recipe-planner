"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEffortLabel, type EffortLabel } from "@/lib/effort";
import { getMissingIngredients, getRequiredIngredients } from "@/lib/matching";
import { getPantryStockSets } from "@/lib/pantryStock";
import { planWeek, pickForSlot, type PlannerRecipe, type PlannerSlotInput } from "@/lib/planner";
import { addDays } from "@/lib/week";
import { addRecipesToShoppingList } from "@/app/shopping-list/actions";
import { requireAuth } from "@/lib/auth";

function revalidatePlannerSurfaces() {
  revalidatePath("/planner");
  revalidatePath("/pantry");
  revalidatePath("/shopping-list");
  revalidatePath("/");
}

function toExcludedList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// DINNER recipes not cooked in the last 21 days, each with the fields
// lib/planner.ts needs to score it: missing/low counts already folded in
// linked components, the same way the shopping list treats them.
async function getCandidates(): Promise<PlannerRecipe[]> {
  const twentyOneDaysAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

  const [recipes, { wellStocked, lowOrOut, low }, recentCookLogs] = await Promise.all([
    prisma.recipe.findMany({
      where: { mealType: "DINNER" },
      include: {
        ingredients: { include: { ingredient: true } },
        cuisines: true,
        components: {
          include: { component: { include: { ingredients: { include: { ingredient: true } } } } },
        },
      },
    }),
    getPantryStockSets(),
    prisma.cookLog.findMany({
      where: { cookedAt: { gte: twentyOneDaysAgo } },
      select: { recipeId: true },
    }),
  ]);

  const recentlyCooked = new Set(recentCookLogs.map((c) => c.recipeId));

  return recipes
    .filter((r) => !recentlyCooked.has(r.id))
    .map((r) => {
      const ownIngredients = r.ingredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        isStaple: ri.ingredient.isStaple,
        optional: ri.optional,
      }));
      const componentIngredients = r.components.flatMap((link) =>
        link.component.ingredients.map((ri) => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          isStaple: ri.ingredient.isStaple,
          optional: ri.optional,
        }))
      );
      const allIngredients = [...ownIngredients, ...componentIngredients];
      const missingCount = getMissingIngredients(allIngredients, wellStocked, lowOrOut).length;
      const lowUsedCount = getRequiredIngredients(allIngredients).filter((i) =>
        low.has(i.ingredientId)
      ).length;

      return {
        id: r.id,
        title: r.title,
        cuisines: r.cuisines.map((c) => c.value),
        effort: getEffortLabel(r.activeTimeMins, r.totalTimeMins),
        batchFriendly: r.batchFriendly,
        missingCount,
        lowUsedCount,
      };
    });
}

// Unfiltered by the 21-day rule, minimal fields, for interpreting recipes
// that are *already* placed (pinned, or a previous week's leftovers
// reference), which should still count toward this week's targets and
// cuisine-adjacency even though a fresh pick wouldn't currently offer them.
async function getAllDinnerRecipesById() {
  const recipes = await prisma.recipe.findMany({
    where: { mealType: "DINNER" },
    include: { cuisines: true },
  });
  return new Map(
    recipes.map((r) => [
      r.id,
      {
        effort: getEffortLabel(r.activeTimeMins, r.totalTimeMins) as EffortLabel | null,
        cuisines: r.cuisines.map((c) => c.value),
        batchFriendly: r.batchFriendly,
      },
    ])
  );
}

function dayIndexFromDate(startDate: Date, date: Date): number {
  return Math.round((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
}

// Finds this week's plan if it exists, otherwise creates it with 7 empty
// entries, Monday first. startDate must already be local midnight (see
// lib/week.ts's parseWeekStartParam / getWeekStart), so the same calendar
// week always resolves to the same plan.
export async function getOrCreatePlanId(startDate: Date): Promise<string> {
  const existing = await prisma.mealPlan.findUnique({ where: { startDate } });
  if (existing) return existing.id;

  const plan = await prisma.mealPlan.create({
    data: {
      startDate,
      entries: {
        create: Array.from({ length: 7 }, (_, i) => ({ date: addDays(startDate, i) })),
      },
    },
  });
  return plan.id;
}

// Fills every non-pinned slot for the week. Pass targets to change and
// persist this week's low-effort/batch counts in the same call.
export async function generatePlan(
  mealPlanId: string,
  targets?: { lowEffortTarget: number; batchTarget: number }
) {
  await requireAuth();
  if (targets) {
    await prisma.mealPlan.update({
      where: { id: mealPlanId },
      data: { lowEffortTarget: targets.lowEffortTarget, batchTarget: targets.batchTarget },
    });
  }

  const plan = await prisma.mealPlan.findUniqueOrThrow({
    where: { id: mealPlanId },
    include: { entries: true },
  });
  const sortedEntries = [...plan.entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  const candidates = await getCandidates();

  const slots: PlannerSlotInput[] = sortedEntries.map((e, i) => ({
    dayIndex: i,
    pinned: e.pinned,
    existingRecipeId: e.pinned ? e.recipeId : null,
    excludedRecipeIds: toExcludedList(e.excludedRecipeIds),
  }));

  const results = planWeek(candidates, slots, {
    lowEffortTarget: plan.lowEffortTarget,
    batchTarget: plan.batchTarget,
  });

  for (let i = 0; i < results.length; i++) {
    const entry = sortedEntries[i];
    if (entry.pinned) continue;
    const result = results[i];
    const leftoverOfEntryId =
      result.leftoverOfDayIndex != null ? sortedEntries[result.leftoverOfDayIndex].id : null;

    await prisma.mealPlanEntry.update({
      where: { id: entry.id },
      data: {
        recipeId: result.kind === "recipe" ? result.recipeId : null,
        isLeftover: result.kind === "leftover",
        leftoverOfEntryId,
        cookedAt: null,
      },
    });
  }

  revalidatePlannerSurfaces();
}

// Vetoing and "fill this one empty slot" are the same operation: pick a
// replacement excluding whatever's already been rejected here, plus
// whatever the current pick is (added to that rejected list so repeat
// vetoes make progress), plus every recipe already placed elsewhere this
// week.
export async function regenerateSlot(entryId: string) {
  await requireAuth();
  const entry = await prisma.mealPlanEntry.findUniqueOrThrow({ where: { id: entryId } });
  const plan = await prisma.mealPlan.findUniqueOrThrow({
    where: { id: entry.mealPlanId },
    include: { entries: true },
  });

  const [candidates, allById] = await Promise.all([getCandidates(), getAllDinnerRecipesById()]);

  const usedElsewhere = new Set(
    plan.entries.filter((e) => e.id !== entryId && e.recipeId).map((e) => e.recipeId!)
  );
  const excludedList = [
    ...toExcludedList(entry.excludedRecipeIds),
    ...(entry.recipeId ? [entry.recipeId] : []),
  ];

  const dayIndex = dayIndexFromDate(plan.startDate, entry.date);
  const prevEntry = plan.entries.find(
    (e) => dayIndexFromDate(plan.startDate, e.date) === dayIndex - 1
  );
  let precedingCuisines: string[] = [];
  if (prevEntry) {
    const refRecipeId = prevEntry.isLeftover
      ? (plan.entries.find((e) => e.id === prevEntry.leftoverOfEntryId)?.recipeId ?? null)
      : prevEntry.recipeId;
    if (refRecipeId) precedingCuisines = allById.get(refRecipeId)?.cuisines ?? [];
  }

  const lowEffortSoFar = plan.entries.filter(
    (e) => e.id !== entryId && e.recipeId && allById.get(e.recipeId)?.effort === "Low"
  ).length;
  const preferLow = lowEffortSoFar < plan.lowEffortTarget;
  const batchSoFar = plan.entries.filter(
    (e) => e.id !== entryId && e.recipeId && allById.get(e.recipeId)?.batchFriendly
  ).length;
  const avoidBatch = batchSoFar >= plan.batchTarget;

  const picked = pickForSlot(
    candidates,
    usedElsewhere,
    excludedList,
    precedingCuisines,
    preferLow,
    avoidBatch
  );

  await prisma.mealPlanEntry.update({
    where: { id: entryId },
    data: {
      recipeId: picked?.id ?? null,
      isLeftover: false,
      leftoverOfEntryId: null,
      cookedAt: null,
      excludedRecipeIds: excludedList,
    },
  });

  revalidatePlannerSurfaces();
  return { found: !!picked };
}

export async function togglePin(entryId: string, pinned: boolean) {
  await requireAuth();
  await prisma.mealPlanEntry.update({ where: { id: entryId }, data: { pinned } });
  revalidatePath("/planner");
}

// Manual swap. Passing null clears the slot back to empty.
export async function setSlotRecipe(entryId: string, recipeId: string | null) {
  await requireAuth();
  await prisma.mealPlanEntry.update({
    where: { id: entryId },
    data: { recipeId, isLeftover: false, leftoverOfEntryId: null, cookedAt: null },
  });
  revalidatePlannerSurfaces();
}

// Additive: adds the week's dinners (not leftover slots, which don't need
// their own shop) to the shopping list without touching anything already
// there, including whatever the shopping list's own "add from a recipe"
// picker has separately selected.
export async function sendWeekToShoppingList(mealPlanId: string): Promise<number> {
  await requireAuth();
  const plan = await prisma.mealPlan.findUniqueOrThrow({
    where: { id: mealPlanId },
    include: { entries: true },
  });
  const recipeIds = Array.from(
    new Set(plan.entries.filter((e) => !e.isLeftover && e.recipeId).map((e) => e.recipeId!))
  );
  return addRecipesToShoppingList(recipeIds);
}

// Logs the cook and nudges pantry stock down a level for whatever
// non-staple ingredients (this recipe plus any linked components) already
// have a tracked stock level, PLENTY to LOW, LOW to OUT. A judgement call
// given stock is qualitative here, not a quantity, treating "cooked a
// recipe that uses this" as using some of it up.
export async function markSlotCooked(entryId: string) {
  await requireAuth();
  const entry = await prisma.mealPlanEntry.findUniqueOrThrow({
    where: { id: entryId },
    include: {
      recipe: {
        include: {
          ingredients: { include: { ingredient: true } },
          components: {
            include: { component: { include: { ingredients: { include: { ingredient: true } } } } },
          },
        },
      },
    },
  });
  if (!entry.recipeId || !entry.recipe) throw new Error("No recipe in this slot.");
  if (entry.cookedAt) return;

  await prisma.cookLog.create({ data: { recipeId: entry.recipeId } });
  await prisma.mealPlanEntry.update({ where: { id: entryId }, data: { cookedAt: new Date() } });

  const allIngredientRows = [
    ...entry.recipe.ingredients,
    ...entry.recipe.components.flatMap((link) => link.component.ingredients),
  ];
  const nonStapleIds = Array.from(
    new Set(
      allIngredientRows.filter((ri) => !ri.ingredient.isStaple).map((ri) => ri.ingredientId)
    )
  );

  if (nonStapleIds.length > 0) {
    const pantryItems = await prisma.pantryItem.findMany({
      where: { ingredientId: { in: nonStapleIds } },
    });
    for (const item of pantryItems) {
      const next = item.stockLevel === "PLENTY" ? "LOW" : "OUT";
      if (next !== item.stockLevel) {
        await prisma.pantryItem.update({ where: { id: item.id }, data: { stockLevel: next } });
      }
    }
  }

  revalidatePlannerSurfaces();
}
