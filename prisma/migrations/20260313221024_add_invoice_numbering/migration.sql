-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "number" TEXT NOT NULL DEFAULT '',
    "amount" REAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "sourceFilePath" TEXT,
    "tenantId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "createdAt", "id", "month", "sourceFilePath", "tenantId", "type", "updatedAt", "year") SELECT "amount", "createdAt", "id", "month", "sourceFilePath", "tenantId", "type", "updatedAt", "year" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "unique_rent_per_period" ON "Invoice"("tenantId", "type", "month", "year");
CREATE TABLE "new_Tenant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "bankAccountsAsText" TEXT NOT NULL DEFAULT '',
    "invoiceSeqNumber" INTEGER NOT NULL DEFAULT 0,
    "propertyId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tenant_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tenant" ("bankAccountsAsText", "createdAt", "email", "firstName", "id", "lastName", "phone", "propertyId", "updatedAt") SELECT "bankAccountsAsText", "createdAt", "email", "firstName", "id", "lastName", "phone", "propertyId", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
