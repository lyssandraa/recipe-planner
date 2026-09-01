import Link from "next/link";
import { IconBook2 } from "@tabler/icons-react";
import type { MealType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEffortLabel, getHandsOnLine } from "@/lib/effort";
import { NUTRITION_TAGS, NUTRITION_TAG_LABELS, type NutritionTag } from "@/lib/nutritionTags";
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
  OTHER: "Other",
};

function isMealType(value: string): value is MealType {
  return value in MEAL_TYPE_LABELS;
}

function isNutritionTag(value: string): value is NutritionTag {
  return (NUTRITION_TAGS as readonly string[]).includes(value);
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ mealType?: string; tag?: string }>;
}) {
  const { mealType: mealTypeParam, tag: tagParam } = await searchParams;
  const mealType = mealTypeParam && isMealType(mealTypeParam) ? mealTypeParam : null;
  const tag = tagParam && isNutritionTag(tagParam) ? tagParam : null;

  const [recipes, pantryCount] = await Promise.all([
    prisma.recipe.findMany({
      where: {
        ...(mealType ? { mealType } : {}),
        ...(tag ? { ingredients: { some: { ingredient: { [tag]: true } } } } : {}),
      },
      orderBy: { title: "asc" },
      include: { ingredients: { include: { ingredient: true } } },
    }),
    prisma.pantryItem.count(),
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
    ingredientNames: r.ingredients.map((ri) => ri.ingredient.name),
  }));

  const titlePrefix = tag ? NUTRITION_TAG_LABELS[tag] : mealType ? MEAL_TYPE_LABELS[mealType] : null;

  return (
    <div>
      <PageHeader
        title={titlePrefix ? `${titlePrefix} recipes` : "Recipes"}
        subtitle={`${recipes.length} recipe${recipes.length === 1 ? "" : "s"}, ${pantryCount} thing${pantryCount === 1 ? "" : "s"} in your pantry`}
        action={{ label: "+ Add", href: "/recipes/new" }}
        icon={<IconBook2 size={24} stroke={1.75} />}
      />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          {mealType || tag ? (
            <Link href="/recipes" className="text-xs text-sage-deep underline">
              Clear filters
            </Link>
          ) : (
            <span />
          )}
          <Link href="/recipes/import" className="text-xs text-sage-deep underline">
            Import from URL
          </Link>
        </div>
        <RecipeList recipes={cards} />
      </div>
    </div>
  );
}
