import Link from "next/link";
import { IconBasket } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import { getStaticStorageAdvice } from "@/lib/storageAdvice";
import { getStockLevelTextClass } from "@/lib/stockLevel";
import PageHeader from "@/app/components/page-header";
import PantryChecklist, { type PantryItemData } from "./pantry-checklist";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const ingredients = await prisma.ingredient.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
  const lowCount = tracked.filter((i) => i.stockLevel === "LOW").length;
  const outCount = tracked.filter((i) => i.stockLevel === "OUT").length;
  const otherCount = items.filter((i) => i.category === "OTHER").length;

  return (
    <div>
      <PageHeader
        title="Pantry"
        icon={<IconBasket size={24} stroke={1.75} />}
        accents={["lime", "amber", "terracotta"]}
        extra={
          <div className="flex items-center gap-5">
            <div>
              <div className={`text-[17px] font-semibold ${getStockLevelTextClass("PLENTY")}`}>{plentyCount}</div>
              <div className="text-[11px] text-white/70">plenty</div>
            </div>
            <div>
              <div className={`text-[17px] font-semibold ${getStockLevelTextClass("LOW")}`}>{lowCount}</div>
              <div className="text-[11px] text-white/70">low</div>
            </div>
            <div>
              <div className={`text-[17px] font-semibold ${getStockLevelTextClass("OUT")}`}>{outCount}</div>
              <div className="text-[11px] text-white/70">out</div>
            </div>
          </div>
        }
      />
      <div className="p-4">
        {otherCount > 0 && (
          <Link
            href="/pantry/categorize"
            className="mb-3 block rounded-lg bg-amber-tint px-3 py-2 text-xs font-medium text-amber-text"
          >
            {otherCount} ingredient{otherCount === 1 ? "" : "s"} need a category, sort them
          </Link>
        )}
        <PantryChecklist items={items} />
        <p className="mt-3 text-xs text-ink-soft">
          Staples are grouped separately below, they are still assumed
          available unless you mark one low or out.
        </p>
      </div>
    </div>
  );
}
