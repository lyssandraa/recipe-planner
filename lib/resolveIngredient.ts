import { prisma } from "@/lib/prisma";

// Resolves a freeform name to a canonical Ingredient, checking an exact
// (case-insensitive) name match first, then the IngredientSynonym table.
// Shared by anything that needs to match freeform text to the catalog
// (product ingredient parsing, the recipe importer) so there's one
// matching system, not several.
export async function resolveIngredientId(rawName: string): Promise<string | null> {
  const target = rawName.trim().toLowerCase();
  if (!target) return null;

  const [ingredients, synonyms] = await Promise.all([
    prisma.ingredient.findMany({ select: { id: true, name: true } }),
    prisma.ingredientSynonym.findMany({
      select: { ingredientId: true, name: true },
    }),
  ]);

  const directMatch = ingredients.find((i) => i.name.toLowerCase() === target);
  if (directMatch) return directMatch.id;

  const synonymMatch = synonyms.find((s) => s.name.toLowerCase() === target);
  if (synonymMatch) return synonymMatch.ingredientId;

  return null;
}
