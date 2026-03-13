"use server";

import { prisma } from "@/lib/prisma";
import { sendMediaEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import {
  writeInputValues,
  triggerRecalc,
  readOutputValues,
  parseInputMapping,
  parseOutputMapping,
} from "@/lib/sheetsEngine";

function buildInvoiceNumber(month: number, year: number, seqNumber: number, type: string) {
  const INVOICE_TYPE_OFFSET: Record<string, number> = { RENT: 0, MEDIA: 9, OTHER: 19 };
  const mm = month.toString().padStart(2, "0");
  const offset = INVOICE_TYPE_OFFSET[type] ?? 0;
  const num = (seqNumber + offset).toString().padStart(3, "0");
  return `${mm}/${year}/${num}`;
}

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
          tenants: { select: { id: true, firstName: true, lastName: true, invoiceSeqNumber: true, email: true } },
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

    const tenantSeqMap = new Map(
      group.property.tenants.map((t) => [t.id, t.invoiceSeqNumber])
    );

    let created = 0;
    let emailsSent = 0;

    if (toCreate.length > 0) {
      const result = await prisma.invoice.createMany({
        data: toCreate.map((o) => ({
          type: "MEDIA" as const,
          number: buildInvoiceNumber(month, year, tenantSeqMap.get(o.tenantId) ?? 0, "MEDIA"),
          amount: o.amount,
          month,
          year,
          tenantId: o.tenantId,
        })),
      });
      created = result.count;

      // Send emails to tenants that have an email address
      const tenantMap = new Map(group.property.tenants.map((t) => [t.id, t]));
      const emailResults = await Promise.all(
        toCreate
          .filter((o) => tenantMap.get(o.tenantId)?.email)
          .map((o) => {
            const t = tenantMap.get(o.tenantId)!;
            return sendMediaEmail({
              to: t.email!,
              firstName: t.firstName,
              lastName: t.lastName,
              invoiceNumber: buildInvoiceNumber(month, year, t.invoiceSeqNumber, "MEDIA"),
              amount: o.amount,
              month,
              year,
              address: group.property.address,
            });
          })
      );
      emailsSent = emailResults.filter(Boolean).length;
    }

    revalidatePath(`/media/${groupId}`);
    revalidatePath("/tenants");

    return {
      created,
      skipped: existingIds.size,
      outputs,
      emailsSent,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nieznany błąd";
    return { error: `Błąd Google Sheets: ${message}` };
  }
}
