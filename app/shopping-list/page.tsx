import { IconShoppingBag } from "@tabler/icons-react";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/app/components/page-header";
import ShoppingListBuilder from "./shopping-list-builder";
import { getShoppingListItems, getMightNeedSoon } from "./actions";

export const dynamic = "force-dynamic";

export default async function ShoppingListPage() {
  // A plain read, never syncShoppingList: recipe selection only ever lives
  // in client state (never persisted), so calling it here with an empty
  // selection would treat every recipe-derived row as stale and delete it,
  // on a plain page reload as much as on a background revalidation from an
  // unrelated action. Syncing only happens client-side, driven by an actual
  // change to the user's current selection.
  const [items, mightNeedSoon, recipes] = await Promise.all([
    getShoppingListItems(),
    getMightNeedSoon(),
    prisma.recipe.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, mealType: true },
    }),
  ]);

  const toBuyCount = items.filter((i) => !i.checked).length;
  const inTrolleyCount = items.length - toBuyCount;
  const progressPct = items.length > 0 ? Math.round((inTrolleyCount / items.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Shopping list"
        icon={<IconShoppingBag size={24} stroke={1.75} />}
        extra={
          <div>
            <div className="flex items-center gap-6">
              <div>
                <div className="text-[17px] font-semibold text-mint">{toBuyCount}</div>
                <div className="text-[11px] text-white/70">to buy</div>
              </div>
              <div>
                <div className="text-[17px] font-semibold text-sage-light">{inTrolleyCount}</div>
                <div className="text-[11px] text-white/70">in the trolley</div>
              </div>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-mint transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        }
      />
      <div className="p-4">
        <ShoppingListBuilder
          initialItems={items}
          initialMightNeedSoon={mightNeedSoon}
          recipes={recipes}
        />
      </div>
    </div>
  );
}
