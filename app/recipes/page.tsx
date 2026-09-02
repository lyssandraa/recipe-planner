import Link from "next/link";
import { IconBook2 } from "@tabler/icons-react";
import type { MealType, Mood } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEffortLabel, getHandsOnLine } from "@/lib/effort";
import { NUTRITION_TAGS, NUTRITION_TAG_LABELS, type NutritionTag } from "@/lib/nutritionTags";
import { getMissingIngredients } from "@/lib/matching";
import { getPantryStockSets } from "@/lib/pantryStock";
import { MOOD_ORDER, MOOD_LABELS } from "@/lib/tags";
import PageHeader from "@/app/components/page-header";
import RecipeList, { type RecipeCardData } from "./recipe-list";

export const dynamic = "force-dynamic";

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
  DRINK: "Drink",
  BAKING: "Baking",
  SIDE: "Side",
  SAUCE_CONDIMENT: "Sauce or condiment",
  COMPONENT: "Components",
  OTHER: "Other",
};

function isMealType(value: string): value is MealType {
  return value in MEAL_TYPE_LABELS;
}

function isNutritionTag(value: string): value is NutritionTag {
  return (NUTRITION_TAGS as readonly string[]).includes(value);
}

function isMood(value: string): value is Mood {
  return (MOOD_ORDER as readonly string[]).includes(value);
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ mealType?: string; tag?: string; mood?: string; q?: string }>;
}) {
  const { mealType: mealTypeParam, tag: tagParam, mood: moodParam, q } = await searchParams;
  const mealType = mealTypeParam && isMealType(mealTypeParam) ? mealTypeParam : null;
  const tag = tagParam && isNutritionTag(tagParam) ? tagParam : null;
  const mood = moodParam && isMood(moodParam) ? moodParam : null;

  const [recipes, { wellStocked: wellStockedSet, lowOrOut: lowOrOutSet }] = await Promise.all([
    prisma.recipe.findMany({
      where: {
        ...(mealType ? { mealType } : {}),
        ...(tag ? { ingredients: { some: { ingredient: { [tag]: true } } } } : {}),
        ...(mood ? { moods: { some: { value: mood } } } : {}),
      },
      orderBy: { title: "asc" },
      include: {
        ingredients: { include: { ingredient: true } },
        cuisines: true,
        moods: true,
        proteins: true,
        methods: true,
        seasons: true,
      },
    }),
    getPantryStockSets(),
  ]);

  const cards: RecipeCardData[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    imageUrl: r.imageUrl,
    batchFriendly: r.batchFriendly,
    effort: getEffortLabel(r.activeTimeMins, r.totalTimeMins),
    timeLine: getHandsOnLine(r),
    totalTimeMins: r.totalTimeMins,
    mealType: r.mealType,
    componentType: r.componentType,
    ingredientNames: r.ingredients.map((ri) => ri.ingredient.name),
    cuisines: r.cuisines.map((c) => c.value),
    moods: r.moods.map((m) => m.value),
    proteins: r.proteins.map((p) => p.value),
    methods: r.methods.map((m) => m.value),
    seasons: r.seasons.map((s) => s.value),
  }));

  // The header's counts are about actual recipes, not marinades and spice
  // mixes sitting in the same table, so components are left out of both
  // regardless of what's currently in view.
  const properRecipes = recipes.filter((r) => r.mealType !== "COMPONENT");
  const makeableCount = properRecipes.filter((r) => {
    const matchIngredients = r.ingredients.map((ri) => ({
      ingredientId: ri.ingredientId,
      name: ri.ingredient.name,
      isStaple: ri.ingredient.isStaple,
      optional: ri.optional,
    }));
    return getMissingIngredients(matchIngredients, wellStockedSet, lowOrOutSet).length === 0;
  }).length;

  const titlePrefix = tag
    ? NUTRITION_TAG_LABELS[tag]
    : mood
      ? MOOD_LABELS[mood]
      : mealType
        ? MEAL_TYPE_LABELS[mealType]
        : null;

  return (
    <div>
      <PageHeader
        title={titlePrefix ? `${titlePrefix} recipes` : "Recipes"}
        action={{ label: "+ Add", href: "/recipes/new" }}
        icon={<IconBook2 size={24} stroke={1.75} />}
        accents={["terracotta", "lime"]}
        extra={
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[17px] font-semibold text-amber">{properRecipes.length}</div>
              <div className="text-[11px] text-white/70">saved</div>
            </div>
            <div>
              <div className="text-[17px] font-semibold text-lime">{makeableCount}</div>
              <div className="text-[11px] text-white/70">makeable now</div>
            </div>
          </div>
        }
      />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          {mealType || tag || mood ? (
            <Link href="/recipes" className="text-xs text-green-deep underline">
              Clear filters
            </Link>
          ) : (
            <span />
          )}
          <Link href="/recipes/import" className="text-xs text-green-deep underline">
            Import from URL
          </Link>
        </div>
        <RecipeList recipes={cards} initialQuery={q ?? ""} />
      </div>
    </div>
  );
}
