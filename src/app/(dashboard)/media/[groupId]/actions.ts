"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  writeInputValues,
  triggerRecalc,
  readOutputValues,
  parseInputMapping,
  parseOutputMapping,
} from "@/lib/sheetsEngine";

export async function getSettlementGroup(id: number) {
  return prisma.settlementGroup.findUnique({
    where: { id },
    include: {
      property: {
        include: {
          tenants: {
            select: { id: true, firstName: true, lastName: true },
            orderBy: { lastName: "asc" },
          },
        },
      },
    },
  });
}

export async function getGroupInvoices(groupId: number, month: number, year: number) {
  const group = await prisma.settlementGroup.findUnique({
    where: { id: groupId },
    select: {
      property: {
        select: {
          tenants: { select: { id: true } },
        },
      },
    },
  });

  if (!group) return [];

  const tenantIds = group.property.tenants.map((t) => t.id);

  return prisma.invoice.findMany({
    where: {
      type: "MEDIA",
      month,
      year,
      tenantId: { in: tenantIds },
    },
    include: {
      tenant: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { tenant: { lastName: "asc" } },
  });
}

export async function processSettlement(
  groupId: number,
  inputValues: Record<string, string>,
  month: number,
  year: number
) {
  const group = await prisma.settlementGroup.findUnique({
    where: { id: groupId },
    include: {
      property: {
        include: {
          tenants: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!group) return { error: "Nie znaleziono grupy rozliczeniowej." };

  const inputMapping = parseInputMapping(group.inputMappingJSON);
  const outputMapping = parseOutputMapping(group.outputMappingJSON);

  if (outputMapping.length === 0) {
    return { error: "Brak mapowania wyjściowego (outputMapping). Skonfiguruj grupę." };
  }

  // Validate that all output tenantIds belong to this property
  const propertyTenantIds = new Set(group.property.tenants.map((t) => t.id));
  const invalidTenants = outputMapping.filter((m) => !propertyTenantIds.has(m.tenantId));
  if (invalidTenants.length > 0) {
    return { error: `Najemcy o ID ${invalidTenants.map((t) => t.tenantId).join(", ")} nie należą do tej nieruchomości.` };
  }

  try {
    // 1. Write input values to Google Sheets
    if (inputMapping.length > 0 && Object.keys(inputValues).length > 0) {
      await writeInputValues(group.spreadsheetId, inputMapping, inputValues);
    }

    // 2. Trigger recalculation
    await triggerRecalc(group.spreadsheetId);

    // 3. Read output values
    const outputs = await readOutputValues(group.spreadsheetId, outputMapping);

    // 4. Create MEDIA invoices (skip duplicates)
    const existing = await prisma.invoice.findMany({
      where: {
        type: "MEDIA",
        month,
        year,
        tenantId: { in: outputs.map((o) => o.tenantId) },
      },
      select: { tenantId: true },
    });

    const existingIds = new Set(existing.map((e) => e.tenantId));
    const toCreate = outputs.filter(
      (o) => !existingIds.has(o.tenantId) && o.amount > 0
    );

    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.invoice.createMany({
        data: toCreate.map((o) => ({
          type: "MEDIA" as const,
          amount: o.amount,
          month,
          year,
          tenantId: o.tenantId,
        })),
        skipDuplicates: true,
      });
      created = result.count;
    }

    revalidatePath(`/media/${groupId}`);
    revalidatePath("/tenants");

    return {
      created,
      skipped: existingIds.size,
      outputs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nieznany błąd";
    return { error: `Błąd Google Sheets: ${message}` };
  }
}
