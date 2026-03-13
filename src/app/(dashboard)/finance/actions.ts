"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function generateRents(month: number, year: number) {
  // Get all active contracts with tenant info
  const activeContracts = await prisma.contract.findMany({
    where: { isActive: true },
    include: {
      tenant: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  if (activeContracts.length === 0) {
    return { created: 0, skipped: 0, error: "Brak aktywnych umów." };
  }

  // Check which invoices already exist for this period
  const existingInvoices = await prisma.invoice.findMany({
    where: {
      type: "RENT",
      month,
      year,
      tenantId: { in: activeContracts.map((c) => c.tenantId) },
    },
    select: { tenantId: true },
  });

  const existingTenantIds = new Set(existingInvoices.map((i) => i.tenantId));

  // Filter to only contracts whose tenant doesn't already have a rent invoice
  const toCreate = activeContracts.filter(
    (c) => !existingTenantIds.has(c.tenantId)
  );

  if (toCreate.length > 0) {
    await prisma.invoice.createMany({
      data: toCreate.map((c) => ({
        type: "RENT" as const,
        amount: c.rentAmount,
        month,
        year,
        tenantId: c.tenantId,
      })),
    });
  }

  revalidatePath("/finance");
  revalidatePath("/tenants");

  return {
    created: toCreate.length,
    skipped: existingTenantIds.size,
    total: activeContracts.length,
  };
}

export async function getGeneratedRents(month: number, year: number) {
  return prisma.invoice.findMany({
    where: { type: "RENT", month, year },
    include: {
      tenant: {
        select: {
          firstName: true,
          lastName: true,
          property: { select: { address: true } },
        },
      },
    },
    orderBy: { tenant: { lastName: "asc" } },
  });
}

export async function getFinanceStats() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [activeContracts, currentRents] = await Promise.all([
    prisma.contract.count({ where: { isActive: true } }),
    prisma.invoice.count({
      where: { type: "RENT", month: currentMonth, year: currentYear },
    }),
  ]);

  return { activeContracts, currentRents, currentMonth, currentYear };
}
