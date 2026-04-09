"use server";

import { prisma } from "@/lib/prisma";
import { sendRentEmail } from "@/lib/email";
import { writeNamedRanges, exportSheetAsPdf } from "@/lib/sheetsEngine";
import { amountToWordsPLN } from "@/lib/numberWords";
import { revalidatePath } from "next/cache";

const MONTHS_PL = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const INVOICE_TYPE_OFFSET: Record<string, number> = {
  RENT: 0,
  MEDIA: 9,
  OTHER: 19,
};

function buildInvoiceNumber(month: number, year: number, seqNumber: number, type: string) {
  const mm = month.toString().padStart(2, "0");
  const offset = INVOICE_TYPE_OFFSET[type] ?? 0;
  const num = (seqNumber + offset).toString().padStart(3, "0");
  return `${mm}/${year}/${num}`;
}

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

  let emailsSent = 0;

  if (toCreate.length > 0) {
    await prisma.invoice.createMany({
      data: toCreate.map((c) => ({
        type: "RENT" as const,
        number: buildInvoiceNumber(month, year, c.invoiceSeqNumber, "RENT"),
        amount: c.rentAmount,
        month,
        year,
        tenantId: c.tenantId,
      })),
    });

    // Send emails to tenants that have an email address
    const createdInvoices = await prisma.invoice.findMany({
      where: { type: "RENT", month, year, tenantId: { in: toCreate.map((c) => c.tenantId) } },
      include: {
        tenant: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            property: { select: { address: true } },
          },
        },
      },
    });

    const appConfig = await prisma.appConfig.findUnique({ where: { id: 1 } });
    const pdfEnabled =
      appConfig &&
      appConfig.rentInvoiceSpreadsheetId.trim() !== "" &&
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    type RangeMapping = { range: string; value: string };
    let rangeMapping: RangeMapping[] = [];
    if (pdfEnabled) {
      try {
        rangeMapping = JSON.parse(appConfig!.rentInvoiceInputMappingJSON);
      } catch {
        rangeMapping = [];
      }
    }

    const invoicesWithEmail = createdInvoices.filter((inv) => inv.tenant.email);

    // Sequential: same sheet is reused per tenant, can't parallelize
    for (const inv of invoicesWithEmail) {
      let pdfAttachment: Buffer | undefined;

      if (pdfEnabled && rangeMapping.length > 0) {
        try {
          const today = new Date();
          const lastDay = new Date(inv.year, inv.month, 0).getDate();
          const context: Record<string, string> = {
            numer_rachunku: inv.number,
            najemca: `${inv.tenant.firstName} ${inv.tenant.lastName}`,
            adres: inv.tenant.property.address,
            miesiac: MONTHS_PL[inv.month - 1],
            rok: inv.year.toString(),
            kwota: inv.amount.toLocaleString("pl-PL", { minimumFractionDigits: 2 }),
            kwota_slownie: amountToWordsPLN(inv.amount),
            data_wystawienia: today.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }),
            termin_platnosci: `${lastDay.toString().padStart(2, "0")}.${inv.month.toString().padStart(2, "0")}.${inv.year}`,
          };

          const values: Record<string, string> = {};
          for (const { range, value } of rangeMapping) {
            values[range] = value.replace(/\{(\w+)\}/g, (_, key) => context[key] ?? "");
          }

          await writeNamedRanges(appConfig!.rentInvoiceSpreadsheetId, values);
          pdfAttachment = await exportSheetAsPdf(
            appConfig!.rentInvoiceSpreadsheetId,
            appConfig!.rentInvoicePdfGid || undefined
          );
        } catch (err) {
          console.error(`[pdf] Błąd generowania PDF dla ${inv.number}:`, err);
        }
      }

      const sent = await sendRentEmail({
        to: inv.tenant.email!,
        firstName: inv.tenant.firstName,
        lastName: inv.tenant.lastName,
        invoiceNumber: inv.number,
        amount: inv.amount,
        month: inv.month,
        year: inv.year,
        address: inv.tenant.property.address,
        pdfAttachment,
      });
      if (sent) emailsSent++;
    }
  }

  revalidatePath("/finance");
  revalidatePath("/tenants");

  return {
    created: toCreate.length,
    skipped: existingTenantIds.size,
    total: activeContracts.length,
    emailsSent,
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
