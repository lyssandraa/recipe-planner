import { notFound } from "next/navigation";
import { IconToolsKitchen2 } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { parseInstructions } from "@/lib/instructions";
import PageHeader from "@/app/components/page-header";
import RecipeForm from "../../recipe-form";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, ingredients] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: { include: { ingredient: true } } },
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!recipe) notFound();

  return (
    <div>
      <PageHeader
        title="Edit recipe"
        icon={<IconToolsKitchen2 size={24} stroke={1.75} />}
        backFallbackHref={`/recipes/${recipe.id}`}
      />
      <div className="p-4">
        <RecipeForm
          ingredientOptions={ingredients}
          initial={{
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            servings: recipe.servings,
            mealType: recipe.mealType,
            totalTimeMins: recipe.totalTimeMins,
            activeTimeMins: recipe.activeTimeMins,
            batchFriendly: recipe.batchFriendly,
            leftoverNote: recipe.leftoverNote,
            source: recipe.source,
            steps: parseInstructions(recipe.instructions),
            ingredients: recipe.ingredients.map((ri) => ({
              ingredientId: ri.ingredientId,
              name: ri.ingredient.name,
              quantity: ri.quantity,
              unit: ri.unit,
              note: ri.note,
              optional: ri.optional,
            })),
          }}
        />
      </div>
    </div>
  );
}
