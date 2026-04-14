import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Properties ─────────────────────────────────────────────────────────────
  const p1 = await prisma.property.create({
    data: { address1: "Jana Pawła 64/1", type: "Mieszkanie" },
  });
  const p2 = await prisma.property.create({
    data: { address1: "Jana Pawła 64/2", type: "Mieszkanie" },
  });

  // ── Tenants ────────────────────────────────────────────────────────────────
  const t1 = await prisma.tenant.create({
    data: {
      firstName: "Marek",
      lastName: "Kowalski",
      email: "vikbobinski+marek@gmail.com",
      phone: "604 123 456",
      bankAccountsAsText: "PL61 1090 1014 0000 0712 1981 2874",
      propertyId: p1.id,
    },
  });
  const t2 = await prisma.tenant.create({
    data: {
      firstName: "Anna",
      lastName: "Wiśniewska",
      email: "vikbobinski+anna@gmail.com",
      phone: "512 987 654",
      bankAccountsAsText: "PL83 1140 2004 0000 3002 0135 5387",
      propertyId: p2.id,
    },
  });

  // ── Contracts ──────────────────────────────────────────────────────────────
  await prisma.contract.create({
    data: {
      tenantId: t1.id,
      rentAmount: 2800,
      invoiceSeqNumber: 1,
      startDate: new Date("2024-01-01"),
      endDate: null,
      isActive: true,
    },
  });
  await prisma.contract.create({
    data: {
      tenantId: t2.id,
      rentAmount: 2200,
      invoiceSeqNumber: 2,
      startDate: new Date("2023-09-01"),
      endDate: null,
      isActive: true,
    },
  });

  // ── Invoices ───────────────────────────────────────────────────────────────
  async function rent(tenantId: number, amount: number, month: number, year: number) {
    return prisma.invoice.create({
      data: { tenantId, type: "RENT", amount, month, year },
    });
  }
  async function media(tenantId: number, amount: number, month: number, year: number) {
    return prisma.invoice.create({
      data: { tenantId, type: "MEDIA", amount, month, year },
    });
  }

  // Historia: lip–gru 2025
  for (const m of [7, 8, 9, 10, 11, 12]) {
    await rent(t1.id, 2800, m, 2025);
    await rent(t2.id, 2200, m, 2025);
  }
  // Sty–mar 2026
  for (const m of [1, 2, 3]) {
    await rent(t1.id, 2800, m, 2026);
    await rent(t2.id, 2200, m, 2026);
  }

  // Media – kwartalnie
  await media(t1.id, 340, 9, 2025);
  await media(t1.id, 410, 12, 2025);
  await media(t1.id, 380, 3, 2026);
  await media(t2.id, 280, 9, 2025);
  await media(t2.id, 320, 12, 2025);
  await media(t2.id, 295, 3, 2026);

  // ── Transactions ───────────────────────────────────────────────────────────
  // t1 – terminowe płatności
  for (const [day, month, year] of [
    [5, 7, 2025], [4, 8, 2025], [3, 9, 2025], [6, 10, 2025], [5, 11, 2025], [3, 12, 2025],
    [5, 1, 2026], [4, 2, 2026], [6, 3, 2026],
  ] as [number, number, number][]) {
    await prisma.transaction.create({
      data: {
        type: "BANK",
        status: "MATCHED",
        amount: 2800,
        date: new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`),
        title: `Czynsz ${month}/${year} - Kowalski`,
        bankAccount: "PL61 1090 1014 0000 0712 1981 2874",
        tenantId: t1.id,
      },
    });
  }

  // t2 – lekko spóźnione płatności, marzec 2026 niezapłacony
  for (const [day, month, year] of [
    [8, 7, 2025], [10, 8, 2025], [7, 9, 2025], [12, 10, 2025], [9, 11, 2025], [8, 12, 2025],
    [7, 1, 2026], [6, 2, 2026],
  ] as [number, number, number][]) {
    await prisma.transaction.create({
      data: {
        type: "BANK",
        status: "MATCHED",
        amount: 2200,
        date: new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`),
        title: `Przelew czynsz ${month}/${year} - Wiśniewska`,
        bankAccount: "PL83 1140 2004 0000 3002 0135 5387",
        tenantId: t2.id,
      },
    });
  }

  // Media – płatności
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "MATCHED",
      amount: 340,
      date: new Date("2025-10-03"),
      title: "Media Q3/2025 Kowalski",
      bankAccount: "PL61 1090 1014 0000 0712 1981 2874",
      tenantId: t1.id,
    },
  });
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "MATCHED",
      amount: 280,
      date: new Date("2025-10-09"),
      title: "Media Q3/2025 Wisniewska",
      bankAccount: "PL83 1140 2004 0000 3002 0135 5387",
      tenantId: t2.id,
    },
  });

  // ── Settlement Group (wspólna grupa mediów) ────────────────────────────────
  const sg = await prisma.settlementGroup.create({
    data: {
      name: "Jana Pawła 64",
      spreadsheetId: "EXAMPLE_SPREADSHEET_ID",
      inputMappingJSON: "{}",
      outputMappingJSON: "{}",
    },
  });
  await prisma.settlementGroupProperty.createMany({
    data: [
      { settlementGroupId: sg.id, propertyId: p1.id },
      { settlementGroupId: sg.id, propertyId: p2.id },
    ],
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
