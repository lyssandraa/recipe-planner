-- Splits ShoppingTrip.itemNames (a flat JSON array of names) out into a
-- real ShoppingTripItem table with its own optional price and ingredient
-- link per row, so the tracker can build per-item price history instead
-- of just one lump sum per trip. Existing itemNames data is migrated into
-- rows (name only, no price, nothing to backfill that with) before the
-- column is dropped.
PRAGMA foreign_keys=OFF;

CREATE TABLE "ShoppingTripItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantityText" TEXT,
    "price" REAL,
    "ingredientId" TEXT,
    CONSTRAINT "ShoppingTripItem_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "ShoppingTrip" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShoppingTripItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ShoppingTripItem_tripId_idx" ON "ShoppingTripItem"("tripId");
CREATE INDEX "ShoppingTripItem_ingredientId_idx" ON "ShoppingTripItem"("ingredientId");

INSERT INTO "ShoppingTripItem" ("id", "tripId", "name")
SELECT lower(hex(randomblob(12))), "ShoppingTrip"."id", "je"."value"
FROM "ShoppingTrip", json_each("ShoppingTrip"."itemNames") AS "je";

PRAGMA defer_foreign_keys=ON;
CREATE TABLE "new_ShoppingTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSpent" REAL,
    "itemCount" INTEGER NOT NULL
);
INSERT INTO "new_ShoppingTrip" ("id", "date", "totalSpent", "itemCount")
SELECT "id", "date", "totalSpent", "itemCount" FROM "ShoppingTrip";
DROP TABLE "ShoppingTrip";
ALTER TABLE "new_ShoppingTrip" RENAME TO "ShoppingTrip";
CREATE INDEX "ShoppingTrip_date_idx" ON "ShoppingTrip"("date");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
