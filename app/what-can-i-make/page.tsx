import { IconChefHat } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getEffortLabel, getHandsOnLine } from "@/lib/effort";
import { getMissingIngredients, getRequiredIngredients } from "@/lib/matching";
import { getPantryStockSets } from "@/lib/pantryStock";
import { computeSuggestionScore } from "@/lib/suggestions";
import PageHeader from "@/app/components/page-header";
import WhatCanIMakeList from "./list";

export const dynamic = "force-dynamic";

export default async function WhatCanIMakePage() {
  // lastCookedRows isn't actually filtered to these recipes, just looked
  // up by id afterwards, so it can run alongside the rest instead of
  // waiting on their ids first, one round trip instead of two.
  const [recipes, { wellStocked: wellStockedSet, lowOrOut: lowOrOutSet, low: lowSet }, lastCookedRows] =
    await Promise.all([
      prisma.recipe.findMany({
        where: { mealType: "DINNER" },
        include: { ingredients: { include: { ingredient: true } } },
        orderBy: { title: "asc" },
      }),
      getPantryStockSets(),
      prisma.cookLog.groupBy({ by: ["recipeId"], _max: { cookedAt: true } }),
    ]);
  const lastCookedByRecipe = new Map(
    lastCookedRows.map((r) => [r.recipeId, r._max.cookedAt])
  );

  const cards = recipes.map((recipe) => {
    const matchIngredients = recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      isStaple: ri.ingredient.isStaple,
      optional: ri.optional,
    }));
    const missing = getMissingIngredients(matchIngredients, wellStockedSet, lowOrOutSet);
    const requiredIds = getRequiredIngredients(matchIngredients).map((i) => i.ingredientId);
    const lastCookedAt = lastCookedByRecipe.get(recipe.id) ?? null;

    return {
      id: recipe.id,
      title: recipe.title,
      effort: getEffortLabel(recipe.activeTimeMins, recipe.totalTimeMins),
      timeLine: getHandsOnLine(recipe),
      missingCount: missing.length,
      missingNames: missing.map((m) => m.name),
      suggestionScore: computeSuggestionScore({ ingredientIds: requiredIds, lastCookedAt }, lowSet),
    };
  });

  // Missing-count buckets stay the primary grouping (the client groups by
  // this), but within a bucket, favour recipes that use something running
  // low and haven't been cooked recently.
  cards.sort((a, b) => a.missingCount - b.missingCount || b.suggestionScore - a.suggestionScore);

  const readyCount = cards.filter((c) => c.missingCount === 0).length;

  return (
    <div>
      <PageHeader
        title="What can I make"
        icon={<IconChefHat size={24} stroke={1.75} />}
        accents={["lime", "amber"]}
        extra={
          <div>
            <div className="text-[17px] font-semibold text-lime">{readyCount}</div>
            <div className="text-[11px] text-white/70">
              of {cards.length} dinners ready to go
            </div>
          </div>
        }
      />
      <div className="p-4">
        <WhatCanIMakeList cards={cards} />
      </div>
    </div>
  );
}
