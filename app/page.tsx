import Link from "next/link";
import {
  IconApple,
  IconBaguette,
  IconCake,
  IconChefHat,
  IconCup,
  IconEgg,
  IconShoppingBag,
  IconToolsKitchen2,
} from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { USER_NAME } from "@/lib/config";
import { getGreeting } from "@/lib/greeting";
import { getEffortLabel, getHandsOnLine } from "@/lib/effort";
import { getMissingIngredients } from "@/lib/matching";
import { getPantryStockSets } from "@/lib/pantryStock";
import { isGoodTodaySuggestion } from "@/lib/suggestions";
import { summarizeWeeklyTags, NUTRITION_TAG_LABELS } from "@/lib/nutritionTags";
import TodaySuggestionCard from "./today-suggestion-card";

export const dynamic = "force-dynamic";

// Six tiles max on the dashboard. The remaining meal types (Side, Sauce or
// condiment, Other) are reachable via the recipe list's own mealType filter
// instead of taking up more of the home screen.
const TILES = [
  { mealType: "BREAKFAST", label: "Breakfast", icon: IconEgg, className: "bg-mint" },
  { mealType: "LUNCH", label: "Lunch", icon: IconBaguette, className: "bg-peridot" },
  { mealType: "DINNER", label: "Dinner", icon: IconToolsKitchen2, className: "bg-sage-light" },
  { mealType: "SNACK", label: "Snacks", icon: IconApple, className: "bg-peridot-tint" },
  { mealType: "DRINK", label: "Drinks", icon: IconCup, className: "bg-mint" },
  { mealType: "BAKING", label: "Baking", icon: IconCake, className: "bg-peridot" },
] as const;

export default async function HomePage() {
  const [dinnerRecipes, { wellStocked: wellStockedSet, lowOrOut: lowOrOutSet }, shoppingCount] =
    await Promise.all([
      prisma.recipe.findMany({
        where: { mealType: "DINNER" },
        include: { ingredients: { include: { ingredient: true } } },
      }),
      getPantryStockSets(),
      prisma.shoppingListItem.count({ where: { checked: false } }),
    ]);

  const lastCookedRows = await prisma.cookLog.groupBy({
    by: ["recipeId"],
    where: { recipeId: { in: dinnerRecipes.map((r) => r.id) } },
    _max: { cookedAt: true },
  });
  const lastCookedByRecipe = new Map(lastCookedRows.map((r) => [r.recipeId, r._max.cookedAt]));

  const dinnersWithReadiness = dinnerRecipes.map((recipe) => {
    const matchIngredients = recipe.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      isStaple: ri.ingredient.isStaple,
      optional: ri.optional,
    }));
    const missingCount = getMissingIngredients(
      matchIngredients,
      wellStockedSet,
      lowOrOutSet
    ).length;
    return {
      id: recipe.id,
      title: recipe.title,
      effort: getEffortLabel(recipe.activeTimeMins, recipe.totalTimeMins),
      timeLine: getHandsOnLine(recipe),
      missingCount,
      lastCookedAt: lastCookedByRecipe.get(recipe.id) ?? null,
    };
  });

  const readyCount = dinnersWithReadiness.filter((r) => r.missingCount === 0).length;

  const now = new Date();
  const todayCandidates = dinnersWithReadiness
    .filter((r) => r.missingCount === 0)
    .filter((r) => isGoodTodaySuggestion(r, now))
    .map((r) => ({ id: r.id, title: r.title, effort: r.effort, timeLine: r.timeLine }));

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentCookLogs = await prisma.cookLog.findMany({
    where: { cookedAt: { gte: sevenDaysAgo }, recipe: { mealType: "DINNER" } },
    include: { recipe: { include: { ingredients: { include: { ingredient: true } } } } },
  });
  const weeklyTagSummary = summarizeWeeklyTags(
    recentCookLogs.map((log) =>
      log.recipe.ingredients.map((ri) => ({
        isHighFibre: ri.ingredient.isHighFibre,
        isWholegrain: ri.ingredient.isWholegrain,
        isLegume: ri.ingredient.isLegume,
        isLeafyGreen: ri.ingredient.isLeafyGreen,
        isOilyFish: ri.ingredient.isOilyFish,
      }))
    )
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold text-sage-darker">
        {getGreeting(USER_NAME)}
      </h1>
      <p className="mt-1 text-sm text-text-muted">Ready to cook?</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.mealType}
              href={`/recipes?mealType=${tile.mealType}`}
              className={`flex flex-col items-start gap-3 rounded-2xl p-4 ${tile.className}`}
            >
              <Icon size={28} stroke={1.5} className="text-sage-darker" />
              <span className="text-base font-semibold text-sage-darker">
                {tile.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5">
        <TodaySuggestionCard candidates={todayCandidates} />
      </div>

      {weeklyTagSummary.totalCooked > 0 && weeklyTagSummary.lightestTag && (
        <div className="mt-3 rounded-2xl bg-card p-4 shadow-sm">
          <p className="text-sm text-sage-darker">
            {weeklyTagSummary.totalCooked} dinner
            {weeklyTagSummary.totalCooked === 1 ? "" : "s"} cooked this week,{" "}
            {weeklyTagSummary.tagCounts[weeklyTagSummary.lightestTag]} had{" "}
            {NUTRITION_TAG_LABELS[weeklyTagSummary.lightestTag]}.
          </p>
          <Link
            href={`/recipes?mealType=DINNER&tag=${weeklyTagSummary.lightestTag}`}
            className="mt-1 inline-block text-xs text-sage-deep underline"
          >
            See recipes with {NUTRITION_TAG_LABELS[weeklyTagSummary.lightestTag]}
          </Link>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2">
        <Link
          href="/what-can-i-make"
          className="flex items-center justify-between rounded-lg border border-border-soft bg-card px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm text-sage-darker">
            <IconChefHat size={18} stroke={1.75} className="text-sage-deep" />
            {readyCount} of {dinnerRecipes.length} dinners ready right now
          </span>
          <span className="text-xs text-text-muted">View</span>
        </Link>
        <Link
          href="/shopping-list"
          className="flex items-center justify-between rounded-lg border border-border-soft bg-card px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm text-sage-darker">
            <IconShoppingBag size={18} stroke={1.75} className="text-sage-deep" />
            {shoppingCount} item{shoppingCount === 1 ? "" : "s"} on your shopping list
          </span>
          <span className="text-xs text-text-muted">View</span>
        </Link>
      </div>
    </div>
  );
}
