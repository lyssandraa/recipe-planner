-- Builds out MealPlan/MealPlanEntry for the weekly dinner planner: per-week
-- generation targets, pinning, leftover-day tracking, a cooked marker, and
-- per-slot veto history so regeneration doesn't cycle back to a rejected
-- recipe.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lowEffortTarget" INTEGER NOT NULL DEFAULT 4,
    "batchTarget" INTEGER NOT NULL DEFAULT 2
);
INSERT INTO "new_MealPlan" ("createdAt", "id", "startDate") SELECT "createdAt", "id", "startDate" FROM "MealPlan";
DROP TABLE "MealPlan";
ALTER TABLE "new_MealPlan" RENAME TO "MealPlan";
CREATE UNIQUE INDEX "MealPlan_startDate_key" ON "MealPlan"("startDate");
CREATE TABLE "new_MealPlanEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealPlanId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "recipeId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "isLeftover" BOOLEAN NOT NULL DEFAULT false,
    "leftoverOfEntryId" TEXT,
    "cookedAt" DATETIME,
    "excludedRecipeIds" JSONB,
    CONSTRAINT "MealPlanEntry_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MealPlanEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MealPlanEntry_leftoverOfEntryId_fkey" FOREIGN KEY ("leftoverOfEntryId") REFERENCES "MealPlanEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MealPlanEntry" ("date", "id", "mealPlanId", "recipeId") SELECT "date", "id", "mealPlanId", "recipeId" FROM "MealPlanEntry";
DROP TABLE "MealPlanEntry";
ALTER TABLE "new_MealPlanEntry" RENAME TO "MealPlanEntry";
CREATE INDEX "MealPlanEntry_mealPlanId_idx" ON "MealPlanEntry"("mealPlanId");
CREATE UNIQUE INDEX "MealPlanEntry_mealPlanId_date_key" ON "MealPlanEntry"("mealPlanId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
