import { IconToolsKitchen2 } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/app/components/page-header";
import RecipeForm from "../recipe-form";

export default async function NewRecipePage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Add recipe"
        icon={<IconToolsKitchen2 size={24} stroke={1.75} />}
        backFallbackHref="/recipes"
      />
      <div className="p-4">
        <RecipeForm ingredientOptions={ingredients} />
      </div>
    </div>
  );
}
