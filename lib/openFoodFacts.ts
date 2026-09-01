// Thin client for the Open Food Facts product API. Free, open, no API key.
// https://world.openfoodfacts.org/api/v2/product/{barcode}.json

import { matchFunctionGroup } from "./productIngredients";

const USER_AGENT = "RecipePlanner/1.0 (personal single-user recipe app)";

export type OffIngredientLine = {
  text: string;
  // Declared proportion only (OFF's own `percent` field, filled in when the
  // label states it). Never percent_estimate/percent_min/percent_max,
  // those are OFF's own guesses, not label facts, and must never be shown
  // as though they were a stated percentage.
  percent: number | null;
  functionLabel: string | null;
};

export type OffLookupResult =
  | { found: false }
  | {
      found: true;
      name: string | null;
      brand: string | null;
      rawIngredientsText: string | null;
      // Set only when we know for certain the text isn't English, i.e. we
      // had to fall back to an explicitly non-English-named field like
      // ingredients_text_fr. Null means "assumed English", not "confirmed".
      ingredientsLanguage: string | null;
      countryOfOrigin: string | null;
      countryTags: string[];
      labelsTags: string[];
      nutritionPer100g: Record<string, unknown> | null;
      imageUrl: string | null;
      // Present when Open Food Facts already parsed the ingredients list itself.
      parsedIngredients: OffIngredientLine[] | null;
    };

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// Looks for any product[`${baseKey}_xx`] field (a language-suffixed
// variant OFF didn't give us a more specific name for) and returns it
// along with the language code from the suffix.
function findAnyLocalizedVariant(
  product: Record<string, unknown>,
  baseKey: string
): { value: string; language: string } | null {
  const prefix = `${baseKey}_`;
  for (const key of Object.keys(product)) {
    if (key === `${baseKey}_en` || !key.startsWith(prefix)) continue;
    const value = asNonEmptyString(product[key]);
    if (value) return { value, language: key.slice(prefix.length) };
  }
  return null;
}

// product_name_en before product_name, then any other localised variant,
// then generic_name following the same pattern as a last resort.
function pickName(product: Record<string, unknown>): string | null {
  for (const baseKey of ["product_name", "generic_name"]) {
    const en = asNonEmptyString(product[`${baseKey}_en`]);
    if (en) return en;
    const base = asNonEmptyString(product[baseKey]);
    if (base) return base;
    const localized = findAnyLocalizedVariant(product, baseKey);
    if (localized) return localized.value;
  }
  return null;
}

// ingredients_text_en, then ingredients_text_with_allergens_en, then
// ingredients_text, then whatever other localised variant exists.
// `language` is set only when we know for certain the result isn't
// English, never guessed. The bare `ingredients_text` field is a trap: it
// mirrors the product's own recorded language (product.lang), not the
// lc=en request param, so it's only safe to assume English when the
// product's own language actually is English (or unrecorded).
function pickIngredientsText(
  product: Record<string, unknown>
): { value: string | null; language: string | null } {
  const en = asNonEmptyString(product.ingredients_text_en);
  if (en) return { value: en, language: null };

  const withAllergensEn = asNonEmptyString(product.ingredients_text_with_allergens_en);
  if (withAllergensEn) return { value: withAllergensEn, language: null };

  const base = asNonEmptyString(product.ingredients_text);
  if (base) {
    const productLang = asNonEmptyString(product.lang);
    const isKnownNonEnglish = productLang != null && productLang !== "en";
    return { value: base, language: isKnownNonEnglish ? productLang : null };
  }

  const localized = findAnyLocalizedVariant(product, "ingredients_text");
  if (localized) return { value: localized.value, language: localized.language };

  return { value: null, language: null };
}

// Prefers an ingredient's "en:" id (the canonical English term) over its
// possibly-localised display text.
function extractIngredientName(ing: Record<string, unknown>): string | null {
  const id = typeof ing.id === "string" ? ing.id : null;
  if (id?.startsWith("en:")) {
    const fromId = asNonEmptyString(id.slice(3).replace(/-/g, " "));
    if (fromId) return fromId;
  }

  const text = asNonEmptyString(ing.text);
  if (text) return text;

  if (id) {
    return asNonEmptyString(id.replace(/^[a-z]{2}:/, "").replace(/-/g, " "));
  }
  return null;
}

// Open Food Facts sometimes nests real ingredients under a category header
// entry (its own `ingredients` sub-array), e.g. a "Sweeteners" entry whose
// children are Sorbitol, Mannitol, Aspartame. Recurses into any such
// children, attaching the parent's text as their functionLabel instead of
// treating the header itself as an ingredient. A leaf entry whose own text
// happens to just be a bare category word (no children, e.g. a plain
// "Thickener" with nothing else declared) is kept as a function-only line.
function flattenOffIngredients(
  entries: Record<string, unknown>[],
  inheritedFunctionLabel: string | null
): OffIngredientLine[] {
  const result: OffIngredientLine[] = [];

  for (const ing of entries) {
    const text = extractIngredientName(ing);
    if (!text) continue;

    const children = Array.isArray(ing.ingredients)
      ? (ing.ingredients as Record<string, unknown>[])
      : null;

    if (children && children.length > 0) {
      result.push(...flattenOffIngredients(children, text));
      continue;
    }

    const percent = typeof ing.percent === "number" ? ing.percent : null;
    // A leaf with no inherited parent label whose own text is itself just a
    // bare function word (nothing more specific declared) is function-only.
    // Its text is normalised to match the function label exactly, the same
    // convention the raw-text parser uses to mark a line as function-only
    // rather than a real ingredient.
    const match = inheritedFunctionLabel ? null : matchFunctionGroup(text);
    const bareFunctionMatch = match && match.innerText === null ? match : null;
    const functionLabel = inheritedFunctionLabel ?? bareFunctionMatch?.functionWord ?? null;
    const displayText = bareFunctionMatch ? bareFunctionMatch.functionWord : text;

    result.push({ text: displayText, percent, functionLabel });
  }

  return result;
}

export async function fetchOpenFoodFactsProduct(
  barcode: string
): Promise<OffLookupResult> {
  let res: Response;
  try {
    res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?lc=en&cc=uk`,
      {
        headers: { "User-Agent": USER_AGENT },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );
  } catch {
    return { found: false };
  }

  if (!res.ok) return { found: false };

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { found: false };
  }

  if (
    typeof data !== "object" ||
    data === null ||
    (data as Record<string, unknown>).status !== 1 ||
    typeof (data as Record<string, unknown>).product !== "object"
  ) {
    return { found: false };
  }

  const product = (data as Record<string, unknown>).product as Record<string, unknown>;

  let parsedIngredients: OffIngredientLine[] | null = null;
  if (Array.isArray(product.ingredients) && product.ingredients.length > 0) {
    const lines = flattenOffIngredients(
      product.ingredients as Record<string, unknown>[],
      null
    );
    if (lines.length > 0) parsedIngredients = lines;
  }

  const ingredientsText = pickIngredientsText(product);

  return {
    found: true,
    name: pickName(product),
    brand: asNonEmptyString(product.brands),
    rawIngredientsText: ingredientsText.value,
    ingredientsLanguage: ingredientsText.language,
    countryOfOrigin: asNonEmptyString(product.countries),
    countryTags: asStringArray(product.countries_tags),
    labelsTags: asStringArray(product.labels_tags),
    nutritionPer100g:
      product.nutriments && typeof product.nutriments === "object"
        ? (product.nutriments as Record<string, unknown>)
        : null,
    imageUrl: asNonEmptyString(product.image_url),
    parsedIngredients,
  };
}
