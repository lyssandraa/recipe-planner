import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseInstructions } from "@/lib/instructions";
import CookMode from "./cook-mode";

export const dynamic = "force-dynamic";

export default async function CookModePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ servings?: string }>;
}) {
  const { id } = await params;
  const { servings: servingsParam } = await searchParams;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) notFound();

  const steps = parseInstructions(recipe.instructions);
  const parsedServings = servingsParam ? Number(servingsParam) : null;
  const servings =
    parsedServings != null && Number.isFinite(parsedServings) && parsedServings > 0
      ? parsedServings
      : (recipe.servings ?? 1);

  return (
    <CookMode
      recipeId={recipe.id}
      title={recipe.title}
      originalServings={recipe.servings}
      servings={servings}
      ingredients={recipe.ingredients}
      steps={steps}
    />
  );
}
