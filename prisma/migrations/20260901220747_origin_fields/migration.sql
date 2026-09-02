-- Replaces the single, misleading countryOfOrigin field (which actually
-- held "sold in" data from Open Food Facts' countries_tags, not where the
-- product is from) with three distinct fields, plus a manual override.
-- countryOfOrigin's existing data is what "sold in" always meant, so it
-- moves into soldIn rather than being discarded.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "barcode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "rawIngredientsText" TEXT,
    "ingredientsLanguage" TEXT,
    "ingredientOrigin" TEXT,
    "manufacturingPlace" TEXT,
    "soldIn" TEXT,
    "originOverride" TEXT,
    "nutritionPer100g" JSONB,
    "imageUrl" TEXT,
    "source" TEXT NOT NULL,
    "firstScannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastScannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Product" ("id", "barcode", "name", "brand", "rawIngredientsText", "ingredientsLanguage", "ingredientOrigin", "manufacturingPlace", "soldIn", "originOverride", "nutritionPer100g", "imageUrl", "source", "firstScannedAt", "lastScannedAt")
SELECT "id", "barcode", "name", "brand", "rawIngredientsText", "ingredientsLanguage", NULL, NULL, "countryOfOrigin", NULL, "nutritionPer100g", "imageUrl", "source", "firstScannedAt", "lastScannedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
