import Link from "next/link";
import { IconSettings } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { USER_NAME } from "@/lib/config";
import { getGreeting, getDayTimeLine } from "@/lib/greeting";
import { getEffortLabel, getHandsOnLine } from "@/lib/effort";
import { getMissingIngredients } from "@/lib/matching";
import { getPantryStockSets } from "@/lib/pantryStock";
import { isGoodTodaySuggestion } from "@/lib/suggestions";
import { summarizeWeeklyTags, NUTRITION_TAG_LABELS } from "@/lib/nutritionTags";
import { getCardColorClass, getRecipeEmoji } from "@/lib/recipeVisuals";
import { MOOD_ORDER, MOOD_LABELS, MOOD_EMOJI, MOOD_CHIP_CLASS } from "@/lib/tags";
import TodaySuggestionCard from "./today-suggestion-card";
import DashboardSearch from "./dashboard-search";

export const dynamic = "force-dynamic";

// The remaining meal types (Side, Sauce or condiment, Other, Component) are
// reachable via the recipe list's own filters instead of taking up more of
// the home screen. Components specifically are just a filter chip there,
// not a dashboard destination, they're not a meal you'd plan around.
const TILES = [
  { mealType: "BREAKFAST", label: "Breakfast", emoji: "🍳", tint: "bg-amber-tint", text: "text-ink" },
  { mealType: "LUNCH", label: "Lunch", emoji: "🥪", tint: "bg-terracotta-tint", text: "text-ink" },
  { mealType: "DINNER", label: "Dinner", emoji: "🍽️", tint: "bg-green-deep", text: "text-white" },
  { mealType: "SNACK", label: "Snacks", emoji: "🍎", tint: "bg-teal-tint", text: "text-ink" },
  { mealType: "DRINK", label: "Drinks", emoji: "🥤", tint: "bg-lime-tint", text: "text-ink" },
  { mealType: "BAKING", label: "Baking", emoji: "🧁", tint: "bg-pink-tint", text: "text-ink" },
] as const;

export default async function HomePage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // All five independent of each other (lastCookedRows isn't actually
  // filtered to dinnerRecipes, just looked up by its ids afterwards, so it
  // doesn't need to wait on that query), run in one round trip rather than
  // several sequential ones, which matters a lot more now the database is
  // a remote Turso connection instead of a local SQLite file.
  const [
    dinnerRecipes,
    { wellStocked: wellStockedSet, lowOrOut: lowOrOutSet },
    shoppingCount,
    recentCookLogs,
    lastCookedRows,
  ] = await Promise.all([
    prisma.recipe.findMany({
      where: { mealType: "DINNER" },
      include: { ingredients: { include: { ingredient: true } } },
    }),
    getPantryStockSets(),
    prisma.shoppingListItem.count({ where: { checked: false } }),
    prisma.cookLog.findMany({
      where: { cookedAt: { gte: sevenDaysAgo }, recipe: { mealType: "DINNER" } },
      include: { recipe: { include: { ingredients: { include: { ingredient: true } } } } },
    }),
    prisma.cookLog.groupBy({ by: ["recipeId"], _max: { cookedAt: true } }),
  ]);

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
    const ingredientNames = recipe.ingredients.map((ri) => ri.ingredient.name);
    return {
      id: recipe.id,
      title: recipe.title,
      effort: getEffortLabel(recipe.activeTimeMins, recipe.totalTimeMins),
      timeLine: getHandsOnLine(recipe),
      batchFriendly: recipe.batchFriendly,
      emoji: getRecipeEmoji({ title: recipe.title, mealType: recipe.mealType, ingredientNames }),
      colorClass: getCardColorClass(recipe.id),
      missingCount,
      lastCookedAt: lastCookedByRecipe.get(recipe.id) ?? null,
    };
  });

  const readyCount = dinnersWithReadiness.filter((r) => r.missingCount === 0).length;

  const todayCandidates = dinnersWithReadiness
    .filter((r) => r.missingCount === 0)
    .filter((r) => isGoodTodaySuggestion(r, now))
    .map((r) => ({
      id: r.id,
      title: r.title,
      effort: r.effort,
      timeLine: r.timeLine,
      batchFriendly: r.batchFriendly,
      emoji: r.emoji,
      colorClass: r.colorClass,
    }));

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
    <div>
      <header className="relative overflow-hidden bg-green-deep px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-amber opacity-30"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-lime opacity-25"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-2 right-24 h-14 w-14 rounded-full bg-terracotta opacity-[0.22]"
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-white/70 uppercase">
              {getDayTimeLine(now)}
            </p>
            <h1 className="mt-1 text-[23px] font-bold text-white">{getGreeting(USER_NAME)}</h1>
            <p className="mt-1 text-sm text-white/80">Ready to cook?</p>
          </div>
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80"
          >
            <IconSettings size={20} stroke={1.75} />
          </Link>
        </div>
      </header>

      <div className="p-4">
        <DashboardSearch />

        <Link
          href="/planner"
          className="mt-3 flex items-center gap-3 rounded-2xl border-b-[3px] border-amber bg-card p-4 shadow-sm"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-tint text-2xl">
            📅
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">This week&apos;s dinners</p>
            <p className="text-xs text-ink-soft">Plan the week, or see what&apos;s already planned</p>
          </div>
        </Link>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {TILES.map((tile, i) => (
            <Link
              key={tile.mealType}
              href={`/recipes?mealType=${tile.mealType}`}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`motion-safe:animate-fade-up flex flex-col items-center gap-1.5 rounded-2xl py-4 shadow-sm ${tile.tint}`}
            >
              <span className="text-2xl">{tile.emoji}</span>
              <span className={`text-xs font-semibold ${tile.text}`}>{tile.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Feeling something specific?
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MOOD_ORDER.map((mood) => (
              <Link
                key={mood}
                href={`/recipes?mood=${mood}`}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${MOOD_CHIP_CLASS[mood]}`}
              >
                <span>{MOOD_EMOJI[mood]}</span>
                {MOOD_LABELS[mood]}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <TodaySuggestionCard candidates={todayCandidates} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="/what-can-i-make"
            className="rounded-2xl border-b-[3px] border-lime bg-card p-4"
          >
            <div className="text-2xl">👨‍🍳</div>
            <div className="mt-1.5 text-2xl font-bold text-ink">
              {readyCount}
              <span className="text-sm font-normal text-ink-soft">/{dinnerRecipes.length}</span>
            </div>
            <div className="text-xs text-ink-soft">dinners ready right now</div>
          </Link>
          <Link
            href="/shopping-list"
            className="rounded-2xl border-b-[3px] border-amber bg-card p-4"
          >
            <div className="text-2xl">🛒</div>
            <div className="mt-1.5 text-2xl font-bold text-ink">{shoppingCount}</div>
            <div className="text-xs text-ink-soft">
              item{shoppingCount === 1 ? "" : "s"} on your shopping list
            </div>
          </Link>
        </div>

        {weeklyTagSummary.totalCooked > 0 && weeklyTagSummary.lightestTag && (
          <div className="mt-3 rounded-2xl bg-lime-tint p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-lg">
                🥗
              </span>
              <div className="min-w-0">
                <p className="text-sm text-green-deep">
                  {weeklyTagSummary.totalCooked} dinner
                  {weeklyTagSummary.totalCooked === 1 ? "" : "s"} cooked this week,{" "}
                  {weeklyTagSummary.tagCounts[weeklyTagSummary.lightestTag]} had{" "}
                  {NUTRITION_TAG_LABELS[weeklyTagSummary.lightestTag]}.
                </p>
                <Link
                  href={`/recipes?mealType=DINNER&tag=${weeklyTagSummary.lightestTag}`}
                  className="mt-1 inline-block text-xs font-medium text-green-deep underline"
                >
                  See recipes with {NUTRITION_TAG_LABELS[weeklyTagSummary.lightestTag]}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
