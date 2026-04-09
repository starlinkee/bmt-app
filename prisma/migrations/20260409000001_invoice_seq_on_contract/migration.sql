-- Add invoiceSeqNumber to Contract
ALTER TABLE "Contract" ADD COLUMN "invoiceSeqNumber" INTEGER NOT NULL DEFAULT 0;

-- Copy value from Tenant to all its contracts (preserves existing data)
UPDATE "Contract" SET "invoiceSeqNumber" = (
  SELECT "invoiceSeqNumber" FROM "Tenant" WHERE "Tenant"."id" = "Contract"."tenantId"
);

-- Remove invoiceSeqNumber from Tenant (SQLite requires table recreation)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tenant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "bankAccountsAsText" TEXT NOT NULL DEFAULT '',
    "propertyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tenant_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tenant" ("id", "firstName", "lastName", "email", "phone", "bankAccountsAsText", "propertyId", "createdAt", "updatedAt")
SELECT "id", "firstName", "lastName", "email", "phone", "bankAccountsAsText", "propertyId", "createdAt", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
