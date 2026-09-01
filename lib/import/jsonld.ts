// Layer 1 of the recipe importer: fetch a page and pull a schema.org Recipe
// out of its JSON-LD. Handles a bare Recipe object, a Recipe nested in an
// @graph array, and an array of objects where one has "@type": "Recipe".

const USER_AGENT = "RecipePlanner/1.0 (personal single-user recipe app)";
const SCRIPT_RE =
  /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function isRecipeType(type: unknown): boolean {
  if (typeof type === "string") return type === "Recipe";
  if (Array.isArray(type)) return type.includes("Recipe");
  return false;
}

function findRecipeNode(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (isRecipeType(obj["@type"])) return obj;
    if (Array.isArray(obj["@graph"])) {
      const found = findRecipeNode(obj["@graph"]);
      if (found) return found;
    }
  }
  return null;
}

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  let match: RegExpExecArray | null;
  while ((match = SCRIPT_RE.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      // Malformed JSON-LD block, skip it rather than fail the whole import.
    }
  }
  return blocks;
}

export async function fetchJsonLdRecipe(
  url: string
): Promise<Record<string, unknown> | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const html = await res.text();
  for (const block of extractJsonLdBlocks(html)) {
    const recipe = findRecipeNode(block);
    if (recipe) return recipe;
  }
  return null;
}
