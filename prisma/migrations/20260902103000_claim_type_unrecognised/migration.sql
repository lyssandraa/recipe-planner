-- Adds UNRECOGNISED to ClaimType (no schema change needed, SQLite stores
-- enums as plain text) and makes ProductClaim.explanation optional, since
-- an unrecognised claim may not have a user note yet.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "claimText" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "explanation" TEXT,
    CONSTRAINT "ProductClaim_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProductClaim" ("claimText", "claimType", "explanation", "id", "productId") SELECT "claimText", "claimType", "explanation", "id", "productId" FROM "ProductClaim";
DROP TABLE "ProductClaim";
ALTER TABLE "new_ProductClaim" RENAME TO "ProductClaim";
CREATE INDEX "ProductClaim_productId_idx" ON "ProductClaim"("productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
