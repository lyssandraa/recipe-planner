import { IconCalendarWeek } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getEffortLabel, getHandsOnLine } from "@/lib/effort";
import { getMissingIngredients } from "@/lib/matching";
import { getPantryStockSets } from "@/lib/pantryStock";
import { getCardColorClass, getRecipeEmoji } from "@/lib/recipeVisuals";
import { getWeekStart, formatDayLabel, formatWeekRange, parseWeekStartParam, formatWeekStartParam } from "@/lib/week";
import PageHeader from "@/app/components/page-header";
import { getOrCreatePlanId } from "./actions";
import PlannerView, { type PlannerSlotData } from "./planner-view";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = week ? parseWeekStartParam(week) : getWeekStart();
  const planId = await getOrCreatePlanId(weekStart);

  const [plan, { wellStocked, lowOrOut }, dinnerOptions] = await Promise.all([
    prisma.mealPlan.findUniqueOrThrow({
      where: { id: planId },
      include: {
        entries: {
          orderBy: { date: "asc" },
          include: {
            recipe: {
              include: {
                ingredients: { include: { ingredient: true } },
                cuisines: true,
                components: {
                  include: { component: { include: { ingredients: { include: { ingredient: true } } } } },
                },
              },
            },
            leftoverOf: { include: { recipe: { select: { title: true } } } },
          },
        },
      },
    }),
    getPantryStockSets(),
    prisma.recipe.findMany({
      where: { mealType: "DINNER" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  const slots: PlannerSlotData[] = plan.entries.map((entry, i) => {
    const r = entry.recipe;
    let missingCount: number | null = null;
    let effort = null;
    let timeLine: string | null = null;
    let emoji = "";
    let colorClass = "";
    let cuisines: string[] = [];

    if (r) {
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
      missingCount = getMissingIngredients(
        [...ownIngredients, ...componentIngredients],
        wellStocked,
        lowOrOut
      ).length;
      effort = getEffortLabel(r.activeTimeMins, r.totalTimeMins);
      timeLine = getHandsOnLine(r);
      emoji = getRecipeEmoji({
        title: r.title,
        mealType: r.mealType,
        ingredientNames: r.ingredients.map((ri) => ri.ingredient.name),
      });
      colorClass = getCardColorClass(r.id);
      cuisines = r.cuisines.map((c) => c.value);
    }

    return {
      id: entry.id,
      dayIndex: i,
      dateLabel: formatDayLabel(entry.date),
      recipeId: entry.recipeId,
      recipeTitle: r?.title ?? null,
      emoji,
      colorClass,
      effort,
      timeLine,
      batchFriendly: r?.batchFriendly ?? false,
      cuisines,
      pinned: entry.pinned,
      isLeftover: entry.isLeftover,
      leftoverOfTitle: entry.leftoverOf?.recipe?.title ?? null,
      cookedAt: entry.cookedAt ? entry.cookedAt.toISOString() : null,
      missingCount,
    };
  });

  return (
    <div>
      <PageHeader
        title="This week's dinners"
        icon={<IconCalendarWeek size={24} stroke={1.75} />}
        backFallbackHref="/"
        accents={["lime", "amber"]}
      />
      <div className="p-4">
        <PlannerView
          mealPlanId={plan.id}
          weekStartParam={formatWeekStartParam(weekStart)}
          weekRangeLabel={formatWeekRange(weekStart)}
          lowEffortTarget={plan.lowEffortTarget}
          batchTarget={plan.batchTarget}
          slots={slots}
          dinnerOptions={dinnerOptions}
        />
      </div>
    </div>
  );
}
