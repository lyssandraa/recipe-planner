import { IconCategory } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/app/components/page-header";
import BulkCategorizeList from "./bulk-categorize-list";

export const dynamic = "force-dynamic";

export default async function CategorizePage() {
  const items = await prisma.ingredient.findMany({
    where: { category: "OTHER" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, category: true },
  });

  return (
    <div>
      <PageHeader
        title="Sort Other ingredients"
        icon={<IconCategory size={24} stroke={1.75} />}
        backFallbackHref="/pantry"
      />
      <div className="p-4">
        <BulkCategorizeList items={items} />
      </div>
    </div>
  );
}
