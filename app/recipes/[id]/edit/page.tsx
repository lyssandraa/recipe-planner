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
  const [recipe, ingredients, components] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
        cuisines: true,
        moods: true,
        proteins: true,
        methods: true,
        seasons: true,
        components: { include: { component: { select: { title: true } } } },
      },
    }),
    prisma.ingredient.findMany({ orderBy: { name: "asc" } }),
    prisma.recipe.findMany({
      where: { mealType: "COMPONENT" },
      orderBy: { title: "asc" },
      select: { id: true, title: true, componentType: true },
    }),
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
          componentOptions={components}
          initial={{
            id: recipe.id,
            title: recipe.title,
            description: recipe.description,
            servings: recipe.servings,
            mealType: recipe.mealType,
            componentType: recipe.componentType,
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
            cuisines: recipe.cuisines.map((c) => c.value),
            moods: recipe.moods.map((m) => m.value),
            proteins: recipe.proteins.map((p) => p.value),
            methods: recipe.methods.map((m) => m.value),
            seasons: recipe.seasons.map((s) => s.value),
            components: recipe.components.map((c) => ({
              componentRecipeId: c.componentRecipeId,
              title: c.component.title,
              note: c.note,
            })),
          }}
        />
      </div>
    </div>
  );
}
