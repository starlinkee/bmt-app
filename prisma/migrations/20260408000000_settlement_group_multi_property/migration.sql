-- CreateTable: join table for many-to-many SettlementGroup <-> Property
CREATE TABLE "SettlementGroupProperty" (
    "settlementGroupId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    CONSTRAINT "SettlementGroupProperty_settlementGroupId_fkey" FOREIGN KEY ("settlementGroupId") REFERENCES "SettlementGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SettlementGroupProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY ("settlementGroupId", "propertyId")
);

-- Migrate existing single-property data into join table
INSERT INTO "SettlementGroupProperty" ("settlementGroupId", "propertyId")
SELECT "id", "propertyId" FROM "SettlementGroup";

-- RedefineTables: remove propertyId column from SettlementGroup
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SettlementGroup" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "inputMappingJSON" TEXT NOT NULL,
    "outputMappingJSON" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SettlementGroup" ("id", "name", "spreadsheetId", "inputMappingJSON", "outputMappingJSON", "createdAt", "updatedAt")
SELECT "id", "name", "spreadsheetId", "inputMappingJSON", "outputMappingJSON", "createdAt", "updatedAt" FROM "SettlementGroup";
DROP TABLE "SettlementGroup";
ALTER TABLE "new_SettlementGroup" RENAME TO "SettlementGroup";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
