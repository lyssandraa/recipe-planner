-- Monthly shopping tracker: a snapshot row per "clear the trolley" action,
-- since ShoppingListItem rows themselves are deleted once bought and this
-- is the only history that survives.
CREATE TABLE "ShoppingTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalSpent" REAL,
    "itemCount" INTEGER NOT NULL,
    "itemNames" JSONB NOT NULL
);

-- CreateIndex
CREATE INDEX "ShoppingTrip_date_idx" ON "ShoppingTrip"("date");
