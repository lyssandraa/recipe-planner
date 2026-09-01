import { prisma } from "./prisma";

export type PantryStockSets = {
  wellStocked: Set<string>;
  lowOrOut: Set<string>;
  // Strictly LOW, not OUT. Useful for "you're running low on this, a
  // recipe that uses it up is a good pick" nudges, distinct from lowOrOut
  // which is used for "does this count as missing" matching.
  low: Set<string>;
};

// Builds the well-stocked/low-or-out sets used everywhere "do I have this"
// matching happens (What Can I Make, the dashboard's ready count, the
// shopping list). Well-stocked is expanded to include anything satisfied by
// something that's actually well stocked, e.g. having unsalted butter at
// PLENTY means butter itself counts as covered too, even though they're
// different ingredients.
export async function getPantryStockSets(): Promise<PantryStockSets> {
  const pantryItems = await prisma.pantryItem.findMany({
    select: { ingredientId: true, stockLevel: true },
  });

  const wellStocked = new Set(
    pantryItems.filter((p) => p.stockLevel === "PLENTY").map((p) => p.ingredientId)
  );
  const lowOrOut = new Set(
    pantryItems.filter((p) => p.stockLevel !== "PLENTY").map((p) => p.ingredientId)
  );
  const low = new Set(
    pantryItems.filter((p) => p.stockLevel === "LOW").map((p) => p.ingredientId)
  );

  if (wellStocked.size > 0) {
    const satisfiesRows = await prisma.ingredient.findMany({
      where: { id: { in: Array.from(wellStocked) } },
      select: { satisfies: { select: { id: true } } },
    });
    for (const row of satisfiesRows) {
      for (const target of row.satisfies) wellStocked.add(target.id);
    }
  }

  return { wellStocked, lowOrOut, low };
}
