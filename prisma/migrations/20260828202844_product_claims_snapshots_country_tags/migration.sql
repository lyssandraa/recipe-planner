-- AlterTable
ALTER TABLE "Product" ADD COLUMN "countryTags" JSONB;
ALTER TABLE "Product" ADD COLUMN "ingredientsLanguage" TEXT;

-- CreateTable
CREATE TABLE "ProductClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    CONSTRAINT "ProductClaim_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawIngredientsText" TEXT,
    "nutritionPer100g" JSONB,
    "sourceRevision" TEXT,
    CONSTRAINT "ProductSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductClaim_productId_idx" ON "ProductClaim"("productId");

-- CreateIndex
CREATE INDEX "ProductSnapshot_productId_idx" ON "ProductSnapshot"("productId");
