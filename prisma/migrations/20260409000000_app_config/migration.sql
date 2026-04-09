-- CreateTable
CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "rentInvoiceSpreadsheetId" TEXT NOT NULL DEFAULT '',
    "rentInvoiceInputMappingJSON" TEXT NOT NULL DEFAULT '[]',
    "rentInvoicePdfGid" TEXT NOT NULL DEFAULT ''
);

-- Seed default row
INSERT INTO "AppConfig" ("id") VALUES (1);
