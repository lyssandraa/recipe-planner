-- AlterTable
ALTER TABLE "ProductIngredient" ADD COLUMN "functionLabel" TEXT;

-- CreateTable
CREATE TABLE "_IngredientSatisfies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_IngredientSatisfies_A_fkey" FOREIGN KEY ("A") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_IngredientSatisfies_B_fkey" FOREIGN KEY ("B") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "isHighFibre" BOOLEAN NOT NULL DEFAULT false,
    "isWholegrain" BOOLEAN NOT NULL DEFAULT false,
    "isLegume" BOOLEAN NOT NULL DEFAULT false,
    "isLeafyGreen" BOOLEAN NOT NULL DEFAULT false,
    "isOilyFish" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Ingredient" ("category", "id", "isStaple", "name", "plural", "storageAdvice") SELECT "category", "id", "isStaple", "name", "plural", "storageAdvice" FROM "Ingredient";
DROP TABLE "Ingredient";
ALTER TABLE "new_Ingredient" RENAME TO "Ingredient";
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");
CREATE INDEX "Ingredient_name_idx" ON "Ingredient"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "_IngredientSatisfies_AB_unique" ON "_IngredientSatisfies"("A", "B");

-- CreateIndex
CREATE INDEX "_IngredientSatisfies_B_index" ON "_IngredientSatisfies"("B");
