-- RedefineTables
PRAGMA foreign_keys=OFF;

-- 1. Recreate Property with address1 + address2 (copy address -> address1)
CREATE TABLE "new_Property" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT '',
    "address1" TEXT NOT NULL DEFAULT '',
    "address2" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Property" ("id", "name", "address1", "address2", "type", "createdAt", "updatedAt")
SELECT "id", "name", "address", NULL, "type", "createdAt", "updatedAt"
FROM "Property";

DROP TABLE "Property";
ALTER TABLE "new_Property" RENAME TO "Property";

-- 2. Add nip to Tenant
ALTER TABLE "Tenant" ADD COLUMN "nip" TEXT;

PRAGMA foreign_keys=ON;
