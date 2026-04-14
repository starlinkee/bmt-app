-- CreateTable
CREATE TABLE "ReminderSchedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReminderTenant" (
    "reminderId" INTEGER NOT NULL,
    "tenantId" INTEGER NOT NULL,

    PRIMARY KEY ("reminderId", "tenantId"),
    CONSTRAINT "ReminderTenant_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "ReminderSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReminderTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
