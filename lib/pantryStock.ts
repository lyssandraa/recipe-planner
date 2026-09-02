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
  // Both independent of each other (the second isn't actually filtered to
  // which ingredients turn out well-stocked, just looked up by id after),
  // fetched together rather than sequentially. This runs on nearly every
  // page, so the extra round trip to a remote database added up.
  const [pantryItems, allSatisfies] = await Promise.all([
    prisma.pantryItem.findMany({ select: { ingredientId: true, stockLevel: true } }),
    prisma.ingredient.findMany({ select: { id: true, satisfies: { select: { id: true } } } }),
  ]);

  const wellStocked = new Set(
    pantryItems.filter((p) => p.stockLevel === "PLENTY").map((p) => p.ingredientId)
  );
  const lowOrOut = new Set(
    pantryItems.filter((p) => p.stockLevel !== "PLENTY").map((p) => p.ingredientId)
  );
  const low = new Set(
    pantryItems.filter((p) => p.stockLevel === "LOW").map((p) => p.ingredientId)
  );

  const satisfiesById = new Map(allSatisfies.map((i) => [i.id, i.satisfies]));
  for (const id of Array.from(wellStocked)) {
    for (const target of satisfiesById.get(id) ?? []) wellStocked.add(target.id);
  }

  return { wellStocked, lowOrOut, low };
}
