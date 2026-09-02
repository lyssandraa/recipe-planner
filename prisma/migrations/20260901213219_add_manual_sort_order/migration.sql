-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "plural" TEXT,
    "isStaple" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "storageAdvice" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHighFibre" BOOLEAN NOT NULL DEFAULT false,
    "isWholegrain" BOOLEAN NOT NULL DEFAULT false,
    "isLegume" BOOLEAN NOT NULL DEFAULT false,
    "isLeafyGreen" BOOLEAN NOT NULL DEFAULT false,
    "isOilyFish" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Ingredient" ("category", "id", "isHighFibre", "isLeafyGreen", "isLegume", "isOilyFish", "isStaple", "isWholegrain", "name", "plural", "storageAdvice") SELECT "category", "id", "isHighFibre", "isLeafyGreen", "isLegume", "isOilyFish", "isStaple", "isWholegrain", "name", "plural", "storageAdvice" FROM "Ingredient";
DROP TABLE "Ingredient";
ALTER TABLE "new_Ingredient" RENAME TO "Ingredient";
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");
CREATE INDEX "Ingredient_name_idx" ON "Ingredient"("name");
CREATE TABLE "new_ShoppingListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "quantityText" TEXT,
    "overrideQuantityText" TEXT,
    "origin" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "ingredientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShoppingListItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShoppingListItem" ("checked", "createdAt", "id", "ingredientId", "name", "origin", "overrideQuantityText", "quantityText") SELECT "checked", "createdAt", "id", "ingredientId", "name", "origin", "overrideQuantityText", "quantityText" FROM "ShoppingListItem";
DROP TABLE "ShoppingListItem";
ALTER TABLE "new_ShoppingListItem" RENAME TO "ShoppingListItem";
CREATE INDEX "ShoppingListItem_ingredientId_idx" ON "ShoppingListItem"("ingredientId");
CREATE UNIQUE INDEX "ShoppingListItem_ingredientId_origin_key" ON "ShoppingListItem"("ingredientId", "origin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
