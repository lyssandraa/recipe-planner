import { notFound } from "next/navigation";
import Link from "next/link";
import { IconPencil, IconStack2 } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getEffortLabel, getEffortTextClass, formatCompactDuration } from "@/lib/effort";
import { parseInstructions } from "@/lib/instructions";
import { formatCookedAgo } from "@/lib/cookLog";
import { computeSubstitutions } from "@/lib/substitution";
import { getCardColorClass } from "@/lib/colorBlock";
import { getRecipeEmoji } from "@/lib/recipeVisuals";
import DetailHero from "@/app/components/detail-hero";
import StatsStrip, { type StatCell } from "@/app/components/stats-strip";
import DeleteRecipeButton from "./delete-button";
import RecipeServingsAndSteps from "./recipe-servings-and-steps";
import ComponentsCard, { type ComponentCardData } from "./components-card";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, lastCooked] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
        components: {
          include: {
            component: {
              include: { ingredients: { include: { ingredient: true } } },
            },
          },
        },
      },
    }),
    prisma.cookLog.findFirst({
      where: { recipeId: id },
      orderBy: { cookedAt: "desc" },
    }),
  ]);
  if (!recipe) notFound();

  const componentCards: ComponentCardData[] = recipe.components.map((link) => ({
    id: link.component.id,
    title: link.component.title,
    componentType: link.component.componentType,
    note: link.note,
    ingredients: link.component.ingredients.map((ri) => ({
      id: ri.id,
      quantity: ri.quantity,
      unit: ri.unit,
      note: ri.note,
      ingredientName: ri.ingredient.name,
    })),
  }));

  const recipeIngredientIds = recipe.ingredients.map((ri) => ri.ingredientId);
  const withSatisfiedBy = await prisma.ingredient.findMany({
    where: { id: { in: recipeIngredientIds } },
    select: { id: true, satisfiedBy: { select: { id: true, name: true } } },
  });
  const satisfiedByMap = new Map(withSatisfiedBy.map((i) => [i.id, i.satisfiedBy]));

  const relevantIds = new Set(recipeIngredientIds);
  for (const i of withSatisfiedBy) for (const s of i.satisfiedBy) relevantIds.add(s.id);

  const pantryRows = await prisma.pantryItem.findMany({
    where: { ingredientId: { in: Array.from(relevantIds) } },
    select: { ingredientId: true },
  });
  const pantryIngredientIds = new Set(pantryRows.map((p) => p.ingredientId));

  const substitutions = computeSubstitutions(
    recipeIngredientIds,
    satisfiedByMap,
    pantryIngredientIds
  );

  const steps = parseInstructions(recipe.instructions);
  const effort = getEffortLabel(recipe.activeTimeMins, recipe.totalTimeMins);

  const cookedLine = lastCooked ? formatCookedAgo(lastCooked.cookedAt) : "not cooked yet";
  const heroSubtitle = recipe.source ? `${recipe.source} · ${cookedLine}` : cookedLine;

  const statCells: StatCell[] = [
    { value: recipe.totalTimeMins != null ? formatCompactDuration(recipe.totalTimeMins) : "-", label: "Total" },
    { value: recipe.activeTimeMins != null ? formatCompactDuration(recipe.activeTimeMins) : "-", label: "Hands-on" },
    {
      value: effort ?? "-",
      label: "Effort",
      valueClassName: effort ? getEffortTextClass(effort) : "",
    },
  ];
  if (recipe.batchFriendly) {
    statCells.push({
      value: <IconStack2 size={20} stroke={1.75} className="text-amber" />,
      label: "Batch",
    });
  }

  return (
    <div>
      <DetailHero
        imageUrl={recipe.imageUrl}
        colorBlockClass={getCardColorClass(recipe.id)}
        emoji={getRecipeEmoji({
          title: recipe.title,
          mealType: recipe.mealType,
          ingredientNames: recipe.ingredients.map((ri) => ri.ingredient.name),
        })}
        accentClassName="bg-lime"
        title={recipe.title}
        subtitle={heroSubtitle}
        backFallbackHref="/recipes"
        topRight={
          <Link
            href={`/recipes/${recipe.id}/edit`}
            aria-label="Edit recipe"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm"
          >
            <IconPencil size={16} stroke={2} />
          </Link>
        }
      />

      <StatsStrip cells={statCells} />

      <div className="flex flex-col gap-4 p-4">
        {recipe.description && (
          <p className="text-sm text-ink-soft">{recipe.description}</p>
        )}

        <ComponentsCard components={componentCards} className="motion-safe:animate-fade-up-sm" />

        <RecipeServingsAndSteps
          recipeId={recipe.id}
          originalServings={recipe.servings}
          ingredients={recipe.ingredients}
          steps={steps}
          substitutions={Object.fromEntries(substitutions)}
          pantryIngredientIds={Array.from(pantryIngredientIds)}
          leftoverNote={recipe.leftoverNote}
        />

        <DeleteRecipeButton recipeId={recipe.id} />
      </div>
    </div>
  );
}
