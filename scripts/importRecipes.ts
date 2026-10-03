import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  CookMethod,
  Cuisine,
  IngredientCategory,
  MealType,
  Mood,
  Protein,
  Season,
  Unit,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { resolveIngredientId } from "../lib/resolveIngredient";
import { guessCategory } from "../lib/guessCategory";
import { serializeInstructions, type RecipeStep } from "../lib/instructions";

// One-off import of public/persian-recipes.json. Safe to rerun: recipes whose
// title already exists are skipped, and ingredients are only created when
// nothing in the catalog matches. Pass --dry-run to print the plan without
// writing anything.

type FileRecipe = {
  title: string;
  description: string | null;
  servings: number | null;
  mealType: string;
  totalTimeMins: number | null;
  activeTimeMins: number | null;
  batchFriendly: boolean;
  leftoverNote: string | null;
  notes?: string;
  tags: Partial<Record<"cuisine" | "mood" | "protein" | "method" | "season", string[]>>;
  ingredients: {
    name: string;
    quantity: number | null;
    unit: string | null;
    note?: string;
    optional?: boolean;
  }[];
  instructions: RecipeStep[];
};

type FileShape = { source?: string; recipes: FileRecipe[] };

const MEAL_TYPES: MealType[] = [
  "BREAKFAST", "LUNCH", "DINNER", "SNACK", "DRINK", "BAKING", "SIDE", "SAUCE_CONDIMENT", "COMPONENT", "OTHER",
];
const UNITS: Unit[] = ["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece"];

const CUISINE_MAP: Record<string, Cuisine> = { Persian: "PERSIAN" };
const MOOD_MAP: Record<string, Mood> = {
  indulgent: "INDULGENT",
  warming: "WARMING",
  comforting: "COMFORTING",
  "fresh and light": "FRESH_LIGHT",
  hearty: "HEARTY",
  "quick and simple": "QUICK_SIMPLE",
};
const PROTEIN_MAP: Record<string, Protein> = {
  lamb: "LAMB",
  vegetarian: "VEGETARIAN",
  chicken: "CHICKEN",
  fish: "FISH",
  eggs: "EGGS",
};
const METHOD_MAP: Record<string, CookMethod> = {
  braised: "BRAISED",
  "one-pan": "ONE_PAN",
  fried: "FRIED",
  baked: "BAKED",
  grilled: "GRILLED",
};
const SEASON_MAP: Record<string, Season> = {
  "all year": "ALL_YEAR",
  spring: "SPRING",
  summer: "SUMMER",
  autumn: "AUTUMN",
  winter: "WINTER",
};

const STAPLE_NAMES = ["salt", "black pepper", "vegetable oil"];

function mapTags<T extends string>(values: string[] | undefined, map: Record<string, T>, label: string, title: string): T[] {
  return (values ?? []).map((v) => {
    const mapped = map[v];
    if (!mapped) throw new Error(`"${title}": unknown ${label} "${v}"`);
    return mapped;
  });
}

function validate(file: FileShape) {
  for (const r of file.recipes) {
    if (!MEAL_TYPES.includes(r.mealType as MealType)) {
      throw new Error(`"${r.title}": unknown mealType "${r.mealType}"`);
    }
    for (const i of r.ingredients) {
      if (i.unit != null && !UNITS.includes(i.unit as Unit)) {
        throw new Error(`"${r.title}": unknown unit "${i.unit}" on "${i.name}"`);
      }
    }
    mapTags(r.tags.cuisine, CUISINE_MAP, "cuisine", r.title);
    mapTags(r.tags.mood, MOOD_MAP, "mood", r.title);
    mapTags(r.tags.protein, PROTEIN_MAP, "protein", r.title);
    mapTags(r.tags.method, METHOD_MAP, "method", r.title);
    mapTags(r.tags.season, SEASON_MAP, "season", r.title);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const path = join(process.cwd(), "public", "persian-recipes.json");
  const file = JSON.parse(readFileSync(path, "utf-8")) as FileShape;
  validate(file);

  const existing = await prisma.recipe.findMany({
    where: { title: { in: file.recipes.map((r) => r.title) } },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((r) => r.title));
  const toCreate = file.recipes.filter((r) => !existingTitles.has(r.title));
  const skipped = file.recipes.filter((r) => existingTitles.has(r.title));

  const uniqueNames = Array.from(
    new Set(toCreate.flatMap((r) => r.ingredients.map((i) => i.name)))
  );

  const idByName = new Map<string, string>();
  const matchedExisting: string[] = [];
  const createdIngredients: { name: string; category: IngredientCategory; usedIn: string[] }[] = [];
  const usedIn = new Map<string, string[]>();
  for (const r of toCreate) {
    for (const i of r.ingredients) {
      usedIn.set(i.name, [...(usedIn.get(i.name) ?? []), r.title]);
    }
  }

  for (const name of uniqueNames) {
    const id = await resolveIngredientId(name);
    if (id) {
      idByName.set(name, id);
      matchedExisting.push(name);
      continue;
    }
    const category = guessCategory(name);
    createdIngredients.push({ name, category, usedIn: usedIn.get(name) ?? [] });
    if (!dryRun) {
      const created = await prisma.ingredient.create({ data: { name, category } });
      idByName.set(name, created.id);
    }
  }

  const staplesChanged: string[] = [];
  for (const stapleName of STAPLE_NAMES) {
    const name = uniqueNames.find((n) => n.toLowerCase() === stapleName);
    if (!name) continue;
    const id = idByName.get(name);
    if (!id) {
      staplesChanged.push(`${name} (new, marked staple)`);
      continue;
    }
    const current = await prisma.ingredient.findUnique({ where: { id }, select: { isStaple: true } });
    if (current && !current.isStaple) {
      staplesChanged.push(name);
      if (!dryRun) await prisma.ingredient.update({ where: { id }, data: { isStaple: true } });
    }
  }

  const warnings: string[] = [];
  const createdRecipes: string[] = [];
  for (const r of toCreate) {
    const ingredientIds = r.ingredients.map((i) => idByName.get(i.name));
    if (!dryRun && ingredientIds.some((id) => id == null)) {
      throw new Error(`"${r.title}": an ingredient was not resolved, aborting`);
    }
    const seenNames = new Set<string>();
    for (const i of r.ingredients) {
      const key = i.name.toLowerCase();
      if (seenNames.has(key)) warnings.push(`"${r.title}" lists "${i.name}" twice`);
      seenNames.add(key);
    }

    const description = [r.description, r.notes].filter(Boolean).join("\n\n") || null;
    const tags = {
      cuisine: mapTags(r.tags.cuisine, CUISINE_MAP, "cuisine", r.title),
      mood: mapTags(r.tags.mood, MOOD_MAP, "mood", r.title),
      protein: mapTags(r.tags.protein, PROTEIN_MAP, "protein", r.title),
      method: mapTags(r.tags.method, METHOD_MAP, "method", r.title),
      season: mapTags(r.tags.season, SEASON_MAP, "season", r.title),
    };

    if (!dryRun) {
      await prisma.recipe.create({
        data: {
          title: r.title,
          description,
          servings: r.servings,
          mealType: r.mealType as MealType,
          totalTimeMins: r.totalTimeMins,
          activeTimeMins: r.activeTimeMins,
          batchFriendly: r.batchFriendly,
          leftoverNote: r.leftoverNote,
          source: file.source ?? null,
          instructions: serializeInstructions(r.instructions),
          ingredients: {
            create: r.ingredients.map((i, idx) => ({
              ingredientId: ingredientIds[idx] as string,
              quantity: i.quantity,
              unit: (i.unit as Unit | null) ?? null,
              note: i.note ?? null,
              optional: i.optional ?? false,
            })),
          },
          cuisines: { create: tags.cuisine.map((value) => ({ value })) },
          moods: { create: tags.mood.map((value) => ({ value })) },
          proteins: { create: tags.protein.map((value) => ({ value })) },
          methods: { create: tags.method.map((value) => ({ value })) },
          seasons: { create: tags.season.map((value) => ({ value })) },
        },
      });
    }
    createdRecipes.push(r.title);
  }

  const label = dryRun ? "DRY RUN, nothing written" : "DONE";
  console.log(`\n=== Persian recipe import: ${label} ===\n`);

  console.log(`Recipes ${dryRun ? "to create" : "created"}: ${createdRecipes.length}`);
  for (const t of createdRecipes) console.log(`  + ${t}`);
  console.log(`Recipes skipped (title already exists): ${skipped.length}`);
  for (const r of skipped) console.log(`  = ${r.title}`);

  console.log(`\nIngredients matched to existing catalog entries: ${matchedExisting.length}`);
  console.log(`Ingredients ${dryRun ? "to create" : "created"} as new: ${createdIngredients.length}`);
  for (const c of createdIngredients) {
    console.log(`  + ${c.name}  [${c.category}]  used in: ${c.usedIn.join(", ")}`);
  }

  console.log(`\nStaples ${dryRun ? "to mark" : "marked"}: ${staplesChanged.length ? staplesChanged.join(", ") : "none needed"}`);

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ! ${w}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
