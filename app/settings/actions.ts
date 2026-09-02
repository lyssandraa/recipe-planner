"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  BACKUP_VERSION,
  type BackupFile,
  type BackupRecipe,
} from "@/lib/backup";

export async function exportBackup(): Promise<BackupFile> {
  const [ingredients, ingredientInfos, recipes, pantryItems, shoppingItems, cookLogs, products] =
    await Promise.all([
      prisma.ingredient.findMany({
        include: { synonyms: true, satisfies: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.ingredientInfo.findMany({ include: { ingredient: { select: { name: true } } } }),
      prisma.recipe.findMany({
        include: {
          ingredients: { include: { ingredient: { select: { name: true } } } },
          cuisines: true,
          moods: true,
          proteins: true,
          methods: true,
          seasons: true,
          components: { include: { component: { select: { title: true } } } },
        },
        orderBy: { title: "asc" },
      }),
      prisma.pantryItem.findMany({
        include: { ingredient: { select: { name: true } }, product: { select: { barcode: true } } },
      }),
      prisma.shoppingListItem.findMany({ include: { ingredient: { select: { name: true } } } }),
      prisma.cookLog.findMany({ include: { recipe: { select: { title: true } } } }),
      prisma.product.findMany({
        include: {
          ingredients: {
            orderBy: { position: "asc" },
            include: { ingredient: { select: { name: true } } },
          },
          claims: true,
          snapshots: true,
        },
      }),
    ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ingredients: ingredients.map((i) => ({
      name: i.name,
      plural: i.plural,
      isStaple: i.isStaple,
      category: i.category,
      storageAdvice: i.storageAdvice,
      sortOrder: i.sortOrder,
      isHighFibre: i.isHighFibre,
      isWholegrain: i.isWholegrain,
      isLegume: i.isLegume,
      isLeafyGreen: i.isLeafyGreen,
      isOilyFish: i.isOilyFish,
      synonyms: i.synonyms.map((s) => s.name),
      satisfies: i.satisfies.map((s) => s.name),
    })),
    ingredientInfo: ingredientInfos.map((info) => ({
      ingredientName: info.ingredient.name,
      functionLabel: info.functionLabel,
      plainEnglish: info.plainEnglish,
      eNumber: info.eNumber,
    })),
    recipes: recipes.map(
      (r): BackupRecipe => ({
        title: r.title,
        description: r.description,
        servings: r.servings,
        instructions: r.instructions,
        totalTimeMins: r.totalTimeMins,
        activeTimeMins: r.activeTimeMins,
        batchFriendly: r.batchFriendly,
        leftoverNote: r.leftoverNote,
        mealType: r.mealType,
        componentType: r.componentType,
        source: r.source,
        imageUrl: r.imageUrl,
        ingredients: r.ingredients.map((ri) => ({
          ingredientName: ri.ingredient.name,
          quantity: ri.quantity,
          unit: ri.unit,
          note: ri.note,
          optional: ri.optional,
        })),
        cuisines: r.cuisines.map((c) => c.value),
        moods: r.moods.map((m) => m.value),
        proteins: r.proteins.map((p) => p.value),
        methods: r.methods.map((m) => m.value),
        seasons: r.seasons.map((s) => s.value),
        components: r.components.map((c) => ({
          componentRecipeTitle: c.component.title,
          note: c.note,
        })),
      })
    ),
    pantry: pantryItems.map((p) => ({
      ingredientName: p.ingredient.name,
      stockLevel: p.stockLevel,
      productBarcode: p.product?.barcode ?? null,
    })),
    shoppingList: shoppingItems.map((s) => ({
      name: s.name,
      quantityText: s.quantityText,
      overrideQuantityText: s.overrideQuantityText,
      origin: s.origin,
      checked: s.checked,
      ingredientName: s.ingredient?.name ?? null,
      sortOrder: s.sortOrder,
    })),
    cookLog: cookLogs.map((c) => ({
      recipeTitle: c.recipe.title,
      cookedAt: c.cookedAt.toISOString(),
    })),
    products: products.map((p) => ({
      barcode: p.barcode,
      name: p.name,
      brand: p.brand,
      rawIngredientsText: p.rawIngredientsText,
      ingredientsLanguage: p.ingredientsLanguage,
      ingredientOrigin: p.ingredientOrigin,
      manufacturingPlace: p.manufacturingPlace,
      soldIn: p.soldIn,
      originOverride: p.originOverride,
      nutritionPer100g: p.nutritionPer100g,
      imageUrl: p.imageUrl,
      source: p.source,
      firstScannedAt: p.firstScannedAt.toISOString(),
      lastScannedAt: p.lastScannedAt.toISOString(),
      ingredients: p.ingredients.map((pi) => ({
        position: pi.position,
        rawText: pi.rawText,
        ingredientName: pi.ingredient?.name ?? null,
        eNumber: pi.eNumber,
        percentage: pi.percentage,
        functionLabel: pi.functionLabel,
      })),
      claims: p.claims.map((c) => ({
        claimText: c.claimText,
        claimType: c.claimType,
        explanation: c.explanation,
      })),
      snapshots: p.snapshots.map((s) => ({
        capturedAt: s.capturedAt.toISOString(),
        rawIngredientsText: s.rawIngredientsText,
        nutritionPer100g: s.nutritionPer100g,
        sourceRevision: s.sourceRevision,
      })),
    })),
  };
}

export type ImportResult = {
  ingredientsWritten: number;
  recipesWritten: number;
  pantryWritten: number;
  shoppingItemsWritten: number;
  cookLogWritten: number;
  productsWritten: number;
};

// Restores a backup written by exportBackup. Every step matches on the
// same stable keys the export used (ingredient name, recipe title, product
// barcode), never a database id, so this works the same whether it's
// going into the database that made the file or a brand new one. Safe to
// run more than once: ingredients, recipes and products are proper
// upserts; pantry/cook log/shopping list/snapshots skip rows that already
// look identical rather than piling up duplicates on a repeat import.
export async function importBackup(file: BackupFile): Promise<ImportResult> {
  // Pass 1: ingredients (everything else references these by name).
  for (const ing of file.ingredients) {
    await prisma.ingredient.upsert({
      where: { name: ing.name },
      update: {
        plural: ing.plural,
        isStaple: ing.isStaple,
        category: ing.category as never,
        storageAdvice: ing.storageAdvice,
        sortOrder: ing.sortOrder,
        isHighFibre: ing.isHighFibre,
        isWholegrain: ing.isWholegrain,
        isLegume: ing.isLegume,
        isLeafyGreen: ing.isLeafyGreen,
        isOilyFish: ing.isOilyFish,
      },
      create: {
        name: ing.name,
        plural: ing.plural,
        isStaple: ing.isStaple,
        category: ing.category as never,
        storageAdvice: ing.storageAdvice,
        sortOrder: ing.sortOrder,
        isHighFibre: ing.isHighFibre,
        isWholegrain: ing.isWholegrain,
        isLegume: ing.isLegume,
        isLeafyGreen: ing.isLeafyGreen,
        isOilyFish: ing.isOilyFish,
      },
    });
  }

  // Pass 2: synonyms and satisfies, now that every ingredient exists.
  for (const ing of file.ingredients) {
    for (const synonymName of ing.synonyms) {
      const owner = await prisma.ingredient.findUnique({ where: { name: ing.name } });
      if (!owner) continue;
      await prisma.ingredientSynonym.upsert({
        where: { name: synonymName },
        update: { ingredientId: owner.id },
        create: { name: synonymName, ingredientId: owner.id },
      });
    }
    if (ing.satisfies.length > 0) {
      await prisma.ingredient.update({
        where: { name: ing.name },
        data: { satisfies: { set: ing.satisfies.map((name) => ({ name })) } },
      });
    }
  }

  // Pass 3: IngredientInfo, keyed by the ingredient it's about.
  for (const info of file.ingredientInfo) {
    const owner = await prisma.ingredient.findUnique({ where: { name: info.ingredientName } });
    if (!owner) continue;
    await prisma.ingredientInfo.upsert({
      where: { ingredientId: owner.id },
      update: { functionLabel: info.functionLabel, plainEnglish: info.plainEnglish, eNumber: info.eNumber },
      create: {
        ingredientId: owner.id,
        functionLabel: info.functionLabel,
        plainEnglish: info.plainEnglish,
        eNumber: info.eNumber,
      },
    });
  }

  // Pass 4: recipes without their component links yet (a component link
  // can reference a recipe later in the file that doesn't exist as a row
  // until this pass has run for it too).
  const recipeIdByTitle = new Map<string, string>();
  for (const r of file.recipes) {
    const existing = await prisma.recipe.findFirst({ where: { title: r.title } });
    const data = {
      description: r.description,
      servings: r.servings,
      instructions: r.instructions,
      totalTimeMins: r.totalTimeMins,
      activeTimeMins: r.activeTimeMins,
      batchFriendly: r.batchFriendly,
      leftoverNote: r.leftoverNote,
      mealType: r.mealType as never,
      componentType: r.componentType as never,
      source: r.source,
      imageUrl: r.imageUrl,
    };

    let recipeId: string;
    if (existing) {
      recipeId = existing.id;
      await prisma.$transaction([
        prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
        prisma.recipeCuisine.deleteMany({ where: { recipeId } }),
        prisma.recipeMood.deleteMany({ where: { recipeId } }),
        prisma.recipeProtein.deleteMany({ where: { recipeId } }),
        prisma.recipeCookMethod.deleteMany({ where: { recipeId } }),
        prisma.recipeSeason.deleteMany({ where: { recipeId } }),
        prisma.recipe.update({ where: { id: recipeId }, data }),
      ]);
    } else {
      const created = await prisma.recipe.create({ data: { title: r.title, ...data } });
      recipeId = created.id;
    }
    recipeIdByTitle.set(r.title, recipeId);

    for (const ri of r.ingredients) {
      const ingredient = await prisma.ingredient.findUnique({ where: { name: ri.ingredientName } });
      if (!ingredient) continue;
      await prisma.recipeIngredient.create({
        data: {
          recipeId,
          ingredientId: ingredient.id,
          quantity: ri.quantity,
          unit: ri.unit as never,
          note: ri.note,
          optional: ri.optional,
        },
      });
    }
    if (r.cuisines.length > 0) {
      await prisma.recipeCuisine.createMany({
        data: r.cuisines.map((value) => ({ recipeId, value: value as never })),
      });
    }
    if (r.moods.length > 0) {
      await prisma.recipeMood.createMany({
        data: r.moods.map((value) => ({ recipeId, value: value as never })),
      });
    }
    if (r.proteins.length > 0) {
      await prisma.recipeProtein.createMany({
        data: r.proteins.map((value) => ({ recipeId, value: value as never })),
      });
    }
    if (r.methods.length > 0) {
      await prisma.recipeCookMethod.createMany({
        data: r.methods.map((value) => ({ recipeId, value: value as never })),
      });
    }
    if (r.seasons.length > 0) {
      await prisma.recipeSeason.createMany({
        data: r.seasons.map((value) => ({ recipeId, value: value as never })),
      });
    }
  }

  // Pass 5: component links, now that every recipe row exists.
  for (const r of file.recipes) {
    if (r.components.length === 0) continue;
    const parentId = recipeIdByTitle.get(r.title);
    if (!parentId) continue;
    await prisma.recipeComponent.deleteMany({ where: { parentRecipeId: parentId } });
    for (const link of r.components) {
      const componentId = recipeIdByTitle.get(link.componentRecipeTitle);
      if (!componentId) continue;
      await prisma.recipeComponent.create({
        data: { parentRecipeId: parentId, componentRecipeId: componentId, note: link.note },
      });
    }
  }

  // Pass 6: products, then pantry, shopping list and cook log, which
  // reference recipes/ingredients/products by their now-restored ids.
  const productIdByBarcode = new Map<string, string>();
  for (const p of file.products) {
    const existing = await prisma.product.findUnique({ where: { barcode: p.barcode } });
    const data = {
      name: p.name,
      brand: p.brand,
      rawIngredientsText: p.rawIngredientsText,
      ingredientsLanguage: p.ingredientsLanguage,
      ingredientOrigin: p.ingredientOrigin,
      manufacturingPlace: p.manufacturingPlace,
      soldIn: p.soldIn,
      originOverride: p.originOverride,
      nutritionPer100g: p.nutritionPer100g as never,
      imageUrl: p.imageUrl,
      source: p.source as never,
      firstScannedAt: new Date(p.firstScannedAt),
      lastScannedAt: new Date(p.lastScannedAt),
    };

    let productId: string;
    if (existing) {
      productId = existing.id;
      await prisma.$transaction([
        prisma.productIngredient.deleteMany({ where: { productId } }),
        prisma.productClaim.deleteMany({ where: { productId } }),
        prisma.product.update({ where: { id: productId }, data }),
      ]);
    } else {
      const created = await prisma.product.create({ data: { barcode: p.barcode, ...data } });
      productId = created.id;
    }
    productIdByBarcode.set(p.barcode, productId);

    for (const pi of p.ingredients) {
      const ingredient = pi.ingredientName
        ? await prisma.ingredient.findUnique({ where: { name: pi.ingredientName } })
        : null;
      await prisma.productIngredient.create({
        data: {
          productId,
          position: pi.position,
          rawText: pi.rawText,
          ingredientId: ingredient?.id ?? null,
          eNumber: pi.eNumber,
          percentage: pi.percentage,
          functionLabel: pi.functionLabel,
        },
      });
    }
    for (const claim of p.claims) {
      await prisma.productClaim.create({
        data: {
          productId,
          claimText: claim.claimText,
          claimType: claim.claimType as never,
          explanation: claim.explanation,
        },
      });
    }
    for (const snap of p.snapshots) {
      const already = await prisma.productSnapshot.findFirst({
        where: { productId, capturedAt: new Date(snap.capturedAt) },
      });
      if (already) continue;
      await prisma.productSnapshot.create({
        data: {
          productId,
          capturedAt: new Date(snap.capturedAt),
          rawIngredientsText: snap.rawIngredientsText,
          nutritionPer100g: snap.nutritionPer100g as never,
          sourceRevision: snap.sourceRevision,
        },
      });
    }
  }

  let pantryWritten = 0;
  for (const p of file.pantry) {
    const ingredient = await prisma.ingredient.findUnique({ where: { name: p.ingredientName } });
    if (!ingredient) continue;
    const productId = p.productBarcode ? (productIdByBarcode.get(p.productBarcode) ?? null) : null;
    await prisma.pantryItem.upsert({
      where: { ingredientId: ingredient.id },
      update: { stockLevel: p.stockLevel as never, productId },
      create: { ingredientId: ingredient.id, stockLevel: p.stockLevel as never, productId },
    });
    pantryWritten++;
  }

  let shoppingItemsWritten = 0;
  for (const s of file.shoppingList) {
    const ingredient = s.ingredientName
      ? await prisma.ingredient.findUnique({ where: { name: s.ingredientName } })
      : null;
    if (ingredient) {
      await prisma.shoppingListItem.upsert({
        where: { ingredientId_origin: { ingredientId: ingredient.id, origin: s.origin as never } },
        update: {
          name: s.name,
          quantityText: s.quantityText,
          overrideQuantityText: s.overrideQuantityText,
          checked: s.checked,
          sortOrder: s.sortOrder,
        },
        create: {
          name: s.name,
          quantityText: s.quantityText,
          overrideQuantityText: s.overrideQuantityText,
          origin: s.origin as never,
          checked: s.checked,
          ingredientId: ingredient.id,
          sortOrder: s.sortOrder,
        },
      });
    } else {
      const already = await prisma.shoppingListItem.findFirst({
        where: { name: s.name, origin: s.origin as never, ingredientId: null },
      });
      if (already) continue;
      await prisma.shoppingListItem.create({
        data: {
          name: s.name,
          quantityText: s.quantityText,
          overrideQuantityText: s.overrideQuantityText,
          origin: s.origin as never,
          checked: s.checked,
          sortOrder: s.sortOrder,
        },
      });
    }
    shoppingItemsWritten++;
  }

  let cookLogWritten = 0;
  for (const c of file.cookLog) {
    const recipeId = recipeIdByTitle.get(c.recipeTitle);
    if (!recipeId) continue;
    const cookedAt = new Date(c.cookedAt);
    const already = await prisma.cookLog.findFirst({ where: { recipeId, cookedAt } });
    if (already) continue;
    await prisma.cookLog.create({ data: { recipeId, cookedAt } });
    cookLogWritten++;
  }

  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/pantry");
  revalidatePath("/shopping-list");
  revalidatePath("/planner");

  return {
    ingredientsWritten: file.ingredients.length,
    recipesWritten: file.recipes.length,
    pantryWritten,
    shoppingItemsWritten,
    cookLogWritten,
    productsWritten: file.products.length,
  };
}
