import Link from "next/link";
import { IconBasket } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getStaticStorageAdvice } from "@/lib/storageAdvice";
import PageHeader from "@/app/components/page-header";
import PantryChecklist, { type PantryItemData } from "./pantry-checklist";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: { name: "asc" },
    include: { pantryItem: true, satisfies: { select: { id: true } } },
  });

  const items: PantryItemData[] = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    isStaple: i.isStaple,
    stockLevel: i.pantryItem?.stockLevel ?? null,
    storageAdvice: i.storageAdvice ?? getStaticStorageAdvice(i.name, i.category),
    hasCustomAdvice: i.storageAdvice != null,
    satisfiesIds: i.satisfies.map((s) => s.id),
  }));

  const tracked = items.filter((i) => !i.isStaple);
  const plentyCount = tracked.filter((i) => i.stockLevel === "PLENTY").length;
  const otherCount = items.filter((i) => i.category === "OTHER").length;

  return (
    <div>
      <PageHeader
        title="Pantry"
        subtitle={`${plentyCount} of ${tracked.length} well stocked`}
        icon={<IconBasket size={24} stroke={1.75} />}
      />
      <div className="p-4">
        {otherCount > 0 && (
          <Link
            href="/pantry/categorize"
            className="mb-3 block rounded-lg border border-border-soft bg-card px-3 py-2 text-xs text-sage-deep underline"
          >
            {otherCount} ingredient{otherCount === 1 ? "" : "s"} need a category, sort them
          </Link>
        )}
        <PantryChecklist items={items} />
        <p className="mt-3 text-xs text-text-muted">
          Staples are grouped separately below, they are still assumed
          available unless you mark one low or out.
        </p>
      </div>
    </div>
  );
}
