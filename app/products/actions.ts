"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type ClaimType, type IngredientCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchOpenFoodFactsProduct, type OffIngredientLine } from "@/lib/openFoodFacts";
import { parseIngredientLine, parseIngredientsText } from "@/lib/productIngredients";
import { resolveIngredientId } from "@/lib/resolveIngredient";
import { matchClaims } from "@/lib/claims";
import { guessCategory } from "@/lib/guessCategory";
import { requireAuth } from "@/lib/auth";

type BuiltIngredientRow = {
  position: number;
  rawText: string;
  name: string;
  eNumber: string | null;
  percentage: number | null;
  functionLabel: string | null;
  ingredientId: string | null;
};

// Prefers Open Food Facts' own parsed ingredient list when present (it's
// generally more reliable than re-parsing the label text ourselves), and
// falls back to our own parser otherwise. Either way, each line is then
// resolved against the same canonical-ingredient matching used everywhere
// else in the app. Percentages are declared values only in both paths,
// never OFF's own percent_estimate guesses.
async function buildProductIngredientRows(
  rawIngredientsText: string | null,
  offParsed: OffIngredientLine[] | null
): Promise<BuiltIngredientRow[]> {
  const lines =
    offParsed && offParsed.length > 0
      ? offParsed.map((line, index) => {
          const parsed = parseIngredientLine(line.text);
          return {
            position: index,
            rawText: line.text,
            name: parsed.name,
            eNumber: parsed.eNumber,
            percentage: line.percent ?? parsed.percentage,
            functionLabel: line.functionLabel,
          };
        })
      : rawIngredientsText
        ? parseIngredientsText(rawIngredientsText)
        : [];

  return Promise.all(
    lines.map(async (line) => ({
      ...line,
      ingredientId: await resolveIngredientId(line.name),
    }))
  );
}

function asJson(value: Record<string, unknown> | null): Prisma.InputJsonValue | undefined {
  return value ? (value as Prisma.InputJsonValue) : undefined;
}

// Captures a snapshot of a product's label data. Only kept if it actually
// differs from the most recent one on file, so a rescan of an unchanged
// product doesn't pile up identical rows.
async function captureSnapshotIfChanged(
  productId: string,
  rawIngredientsText: string | null,
  nutritionPer100g: Record<string, unknown> | null
) {
  const latest = await prisma.productSnapshot.findFirst({
    where: { productId },
    orderBy: { capturedAt: "desc" },
  });
  if (latest && latest.rawIngredientsText === rawIngredientsText) return;

  await prisma.productSnapshot.create({
    data: {
      productId,
      rawIngredientsText,
      nutritionPer100g: asJson(nutritionPer100g),
      sourceRevision: null,
    },
  });
}

export type LookupBarcodeResult =
  | { status: "existing"; productId: string }
  | { status: "created"; productId: string }
  | { status: "not_found"; barcode: string };

export async function lookupBarcode(barcode: string): Promise<LookupBarcodeResult> {
  const trimmed = barcode.trim();

  const existing = await prisma.product.findUnique({ where: { barcode: trimmed } });
  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: { lastScannedAt: new Date() },
    });

    // Re-fetch so snapshot history actually accumulates over repeat scans,
    // without touching the product's own stored fields or ingredient rows.
    if (existing.source === "OPEN_FOOD_FACTS") {
      const fresh = await fetchOpenFoodFactsProduct(trimmed);
      if (fresh.found) {
        await captureSnapshotIfChanged(
          existing.id,
          fresh.rawIngredientsText,
          fresh.nutritionPer100g
        );

        // A manual correction always wins over whatever the API says, on
        // this scan and every one after it, so the origin fields are left
        // untouched (and effectively unused) while one is set.
        if (!existing.originOverride) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              ingredientOrigin: fresh.ingredientOrigin,
              manufacturingPlace: fresh.manufacturingPlace,
              soldIn: fresh.soldIn,
            },
          });
        }
      }
    }

    return { status: "existing", productId: existing.id };
  }

  const result = await fetchOpenFoodFactsProduct(trimmed);
  if (!result.found || !result.name) {
    return { status: "not_found", barcode: trimmed };
  }

  const rows = await buildProductIngredientRows(
    result.rawIngredientsText,
    result.parsedIngredients
  );
  const claims = matchClaims({ labelsTags: result.labelsTags, name: result.name });

  const product = await prisma.product.create({
    data: {
      barcode: trimmed,
      name: result.name,
      brand: result.brand,
      rawIngredientsText: result.rawIngredientsText,
      ingredientsLanguage: result.ingredientsLanguage,
      ingredientOrigin: result.ingredientOrigin,
      manufacturingPlace: result.manufacturingPlace,
      soldIn: result.soldIn,
      nutritionPer100g: asJson(result.nutritionPer100g),
      imageUrl: result.imageUrl,
      source: "OPEN_FOOD_FACTS",
      ingredients: {
        create: rows.map((r) => ({
          position: r.position,
          rawText: r.rawText,
          ingredientId: r.ingredientId,
          eNumber: r.eNumber,
          percentage: r.percentage,
          functionLabel: r.functionLabel,
        })),
      },
      claims: {
        create: claims.map((c) => ({
          claimText: c.claimText,
          claimType: c.claimType,
          explanation: c.explanation,
        })),
      },
      snapshots: {
        create: [
          {
            rawIngredientsText: result.rawIngredientsText,
            nutritionPer100g: asJson(result.nutritionPer100g),
          },
        ],
      },
    },
  });

  revalidatePath(`/products/${product.id}`);
  return { status: "created", productId: product.id };
}

export type ManualProductInput = {
  barcode: string;
  name: string;
  brand: string | null;
  ingredientOrigin: string | null;
  rawIngredientsText: string | null;
  imageUrl: string | null;
};

export async function createManualProduct(input: ManualProductInput) {
  await requireAuth();
  const rows = await buildProductIngredientRows(input.rawIngredientsText, null);
  const claims = matchClaims({ labelsTags: [], name: input.name });

  const product = await prisma.product.create({
    data: {
      barcode: input.barcode.trim(),
      name: input.name.trim(),
      brand: input.brand,
      ingredientOrigin: input.ingredientOrigin,
      rawIngredientsText: input.rawIngredientsText,
      imageUrl: input.imageUrl,
      source: "MANUAL",
      ingredients: {
        create: rows.map((r) => ({
          position: r.position,
          rawText: r.rawText,
          ingredientId: r.ingredientId,
          eNumber: r.eNumber,
          percentage: r.percentage,
          functionLabel: r.functionLabel,
        })),
      },
      claims: {
        create: claims.map((c) => ({
          claimText: c.claimText,
          claimType: c.claimType,
          explanation: c.explanation,
        })),
      },
      snapshots: {
        create: [{ rawIngredientsText: input.rawIngredientsText }],
      },
    },
  });

  revalidatePath(`/products/${product.id}`);
  return { productId: product.id };
}

export type AddToPantryResult =
  | { matched: true; ingredientName: string }
  | { matched: false };

// Resolves the product itself (by its own name) to a canonical ingredient
// and marks that as present. Scanning a jar of rice means "I have rice,
// specifically this jar", not "I have every ingredient printed on its label."
export async function addProductToPantry(productId: string): Promise<AddToPantryResult> {
  await requireAuth();
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const ingredientId = await resolveIngredientId(product.name);
  if (!ingredientId) return { matched: false };

  await prisma.pantryItem.upsert({
    where: { ingredientId },
    update: { productId },
    create: { ingredientId, productId },
  });

  const ingredient = await prisma.ingredient.findUniqueOrThrow({
    where: { id: ingredientId },
  });

  revalidatePath("/pantry");
  revalidatePath("/what-can-i-make");
  revalidatePath("/shopping-list");
  revalidatePath(`/products/${productId}`);

  return { matched: true, ingredientName: ingredient.name };
}

// Used when the product's name doesn't resolve to anything, offered inline
// on the product screen instead of just failing silently.
export async function createIngredientAndAddToPantry(
  productId: string,
  name: string,
  category: IngredientCategory
): Promise<AddToPantryResult> {
  await requireAuth();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Ingredient name is required.");

  const ingredient = await prisma.ingredient.create({
    data: { name: trimmed, category: category ?? guessCategory(trimmed) },
  });

  await prisma.pantryItem.upsert({
    where: { ingredientId: ingredient.id },
    update: { productId },
    create: { ingredientId: ingredient.id, productId },
  });

  revalidatePath("/pantry");
  revalidatePath("/what-can-i-make");
  revalidatePath("/shopping-list");
  revalidatePath(`/products/${productId}`);

  return { matched: true, ingredientName: ingredient.name };
}

// Empty clears the override, reverting to whatever the API fields (or lack
// of them) resolve to. Set, it takes priority over ingredientOrigin,
// manufacturingPlace and soldIn for display, and is preserved across future
// rescans rather than getting overwritten by fresh API data.
export async function setOriginOverride(productId: string, value: string | null) {
  await requireAuth();
  await prisma.product.update({
    where: { id: productId },
    data: { originOverride: value?.trim() || null },
  });
  revalidatePath(`/products/${productId}`);
}

export async function saveIngredientInfo(
  ingredientId: string,
  input: { functionLabel: string | null; plainEnglish: string | null }
) {
  await requireAuth();
  await prisma.ingredientInfo.upsert({
    where: { ingredientId },
    update: {
      functionLabel: input.functionLabel,
      plainEnglish: input.plainEnglish,
    },
    create: {
      ingredientId,
      functionLabel: input.functionLabel,
      plainEnglish: input.plainEnglish,
    },
  });
}

// explanation is required for a matched claim type (CERTIFIED, REGULATED,
// UNREGULATED all come with a definition from lib/claims.ts), but optional
// for UNRECOGNISED, where the user may not have anything to add yet.
export async function addManualClaim(
  productId: string,
  claimText: string,
  claimType: ClaimType,
  explanation: string | null
) {
  await requireAuth();
  const trimmedText = claimText.trim();
  const trimmedExplanation = explanation?.trim() || null;
  if (!trimmedText) throw new Error("Claim text is required.");
  if (claimType !== "UNRECOGNISED" && !trimmedExplanation) {
    throw new Error("An explanation is required.");
  }

  const claim = await prisma.productClaim.create({
    data: {
      productId,
      claimText: trimmedText,
      claimType,
      explanation: trimmedExplanation,
    },
  });

  revalidatePath(`/products/${productId}`);
  return claim;
}
