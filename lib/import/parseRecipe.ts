import { fetchJsonLdRecipe } from "./jsonld";
import { parseIsoDurationToMinutes } from "./duration";
import { parseIngredientLine, type ParsedIngredientLine } from "./ingredientLine";

export type ParsedIngredientDraft = ParsedIngredientLine & { raw: string };

export type ParsedRecipeDraft = {
  title: string;
  description: string | null;
  servings: number | null;
  totalTimeMins: number | null;
  activeTimeMins: number | null;
  imageUrl: string | null;
  steps: { text: string }[];
  ingredients: ParsedIngredientDraft[];
  sourceUrl: string;
};

function asIsoDuration(value: unknown): number | null {
  return typeof value === "string" ? parseIsoDurationToMinutes(value) : null;
}

function extractServings(raw: unknown): number | null {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (typeof text === "number") return Math.round(text);
  if (typeof text !== "string") return null;
  const match = /\d+/.exec(text);
  return match ? Number(match[0]) : null;
}

function extractImageUrl(raw: unknown): string | null {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const found = extractImageUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (raw && typeof raw === "object") {
    const url = (raw as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }
  return null;
}

function extractInstructionSteps(raw: unknown): string[] {
  if (typeof raw === "string") {
    return raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => extractInstructionSteps(item));
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.text === "string") return [obj.text.trim()];
    if (Array.isArray(obj.itemListElement)) {
      return extractInstructionSteps(obj.itemListElement);
    }
    if (typeof obj.name === "string") return [obj.name.trim()];
  }
  return [];
}

// parseRecipe(url) is the single entry point callers use. Layer 1 (JSON-LD)
// and layer 2 (ingredient line parsing) live behind it so another layer can
// be added later (e.g. a microdata or plain-HTML fallback) without touching
// any caller.
export async function parseRecipe(url: string): Promise<ParsedRecipeDraft> {
  const node = await fetchJsonLdRecipe(url);
  if (!node) {
    throw new Error(
      "Couldn't find recipe data on that page. Some sites don't publish it in a format we can read."
    );
  }

  const totalTime = asIsoDuration(node.totalTime);
  const cookTime = asIsoDuration(node.cookTime);
  const prepTime = asIsoDuration(node.prepTime);
  const totalTimeMins =
    totalTime ?? (cookTime != null || prepTime != null ? (cookTime ?? 0) + (prepTime ?? 0) : null);

  const rawIngredients = Array.isArray(node.recipeIngredient)
    ? node.recipeIngredient.filter((i): i is string => typeof i === "string")
    : [];

  return {
    title: typeof node.name === "string" && node.name.trim() ? node.name.trim() : "Untitled recipe",
    description: typeof node.description === "string" ? node.description.trim() || null : null,
    servings: extractServings(node.recipeYield),
    totalTimeMins,
    activeTimeMins: prepTime,
    imageUrl: extractImageUrl(node.image),
    steps: extractInstructionSteps(node.recipeInstructions).map((text) => ({ text })),
    ingredients: rawIngredients.map((raw) => ({ raw, ...parseIngredientLine(raw) })),
    sourceUrl: url,
  };
}
