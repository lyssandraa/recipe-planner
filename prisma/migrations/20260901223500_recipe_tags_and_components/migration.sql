-- Adds five independent tag dimensions (cuisine, mood, protein, cook
-- method, season), each its own join table, plus component-recipe support
-- (a componentType column and a self-referencing RecipeComponent join for
-- "this recipe uses that recipe as a component").
-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN "componentType" TEXT;

-- CreateTable
CREATE TABLE "RecipeCuisine" (
    "recipeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("recipeId", "value"),
    CONSTRAINT "RecipeCuisine_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeMood" (
    "recipeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("recipeId", "value"),
    CONSTRAINT "RecipeMood_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeProtein" (
    "recipeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("recipeId", "value"),
    CONSTRAINT "RecipeProtein_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeCookMethod" (
    "recipeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("recipeId", "value"),
    CONSTRAINT "RecipeCookMethod_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeSeason" (
    "recipeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("recipeId", "value"),
    CONSTRAINT "RecipeSeason_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentRecipeId" TEXT NOT NULL,
    "componentRecipeId" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "RecipeComponent_parentRecipeId_fkey" FOREIGN KEY ("parentRecipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeComponent_componentRecipeId_fkey" FOREIGN KEY ("componentRecipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecipeCuisine_value_idx" ON "RecipeCuisine"("value");

-- CreateIndex
CREATE INDEX "RecipeMood_value_idx" ON "RecipeMood"("value");

-- CreateIndex
CREATE INDEX "RecipeProtein_value_idx" ON "RecipeProtein"("value");

-- CreateIndex
CREATE INDEX "RecipeCookMethod_value_idx" ON "RecipeCookMethod"("value");

-- CreateIndex
CREATE INDEX "RecipeSeason_value_idx" ON "RecipeSeason"("value");

-- CreateIndex
CREATE INDEX "RecipeComponent_componentRecipeId_idx" ON "RecipeComponent"("componentRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeComponent_parentRecipeId_componentRecipeId_key" ON "RecipeComponent"("parentRecipeId", "componentRecipeId");
