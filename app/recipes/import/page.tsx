import { IconLink } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/app/components/page-header";
import ImportForm from "./import-form";

export default async function ImportRecipePage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Import a recipe"
        icon={<IconLink size={24} stroke={1.75} />}
        backFallbackHref="/recipes"
      />
      <div className="p-4">
        <ImportForm ingredientOptions={ingredients} />
      </div>
    </div>
  );
}
