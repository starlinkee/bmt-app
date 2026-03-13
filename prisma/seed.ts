import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Properties ─────────────────────────────────────────────────────────────
  const p1 = await prisma.property.create({
    data: { address: "ul. Lipowa 12/3, Warszawa", type: "Mieszkanie" },
  });
  const p2 = await prisma.property.create({
    data: { address: "ul. Krakowska 5/7, Kraków", type: "Mieszkanie" },
  });
  const p3 = await prisma.property.create({
    data: { address: "ul. Gdańska 8, Poznań", type: "Lokal usługowy" },
  });
  const p4 = await prisma.property.create({
    data: { address: "ul. Słoneczna 22/1, Warszawa", type: "Mieszkanie" },
  });
  const p5 = await prisma.property.create({
    data: { address: "ul. Różana 3/10, Wrocław", type: "Mieszkanie" },
  });

  // ── Tenants ────────────────────────────────────────────────────────────────
  const t1 = await prisma.tenant.create({
    data: {
      firstName: "Marek",
      lastName: "Kowalski",
      email: "m.kowalski@gmail.com",
      phone: "604 123 456",
      bankAccountsAsText: "PL61 1090 1014 0000 0712 1981 2874",
      propertyId: p1.id,
    },
  });
  const t2 = await prisma.tenant.create({
    data: {
      firstName: "Anna",
      lastName: "Wiśniewska",
      email: "anna.wisniewska@wp.pl",
      phone: "512 987 654",
      bankAccountsAsText: "PL83 1140 2004 0000 3002 0135 5387",
      propertyId: p2.id,
    },
  });
  const t3 = await prisma.tenant.create({
    data: {
      firstName: "Tomasz",
      lastName: "Nowak",
      email: "t.nowak@onet.pl",
      phone: "697 456 789",
      bankAccountsAsText: "",
      propertyId: p3.id,
    },
  });
  const t4 = await prisma.tenant.create({
    data: {
      firstName: "Katarzyna",
      lastName: "Zielińska",
      email: "kasia.zielinska@gmail.com",
      phone: "781 234 567",
      bankAccountsAsText: "PL72 1020 4476 0000 8102 0063 1234",
      propertyId: p4.id,
    },
  });
  const t5 = await prisma.tenant.create({
    data: {
      firstName: "Piotr",
      lastName: "Wróbel",
      email: "p.wrobel@interia.pl",
      phone: "603 321 654",
      bankAccountsAsText: "PL55 2490 0005 0000 4500 7890 4321",
      propertyId: p2.id,
    },
  });
  // Dawny najemca (lokal usługowy, zakończona umowa)
  const t6 = await prisma.tenant.create({
    data: {
      firstName: "Firma",
      lastName: "XYZ Sp. z o.o.",
      email: "biuro@xyz.pl",
      phone: "22 555 0100",
      bankAccountsAsText: "PL11 1750 0012 0000 0022 3333 4444",
      propertyId: p3.id,
    },
  });
  // Nowy najemca Wrocław
  const t7 = await prisma.tenant.create({
    data: {
      firstName: "Marta",
      lastName: "Lewandowska",
      email: "marta.lewandowska@gmail.com",
      phone: "790 112 233",
      bankAccountsAsText: "PL33 1600 1462 1800 0002 9101 5555",
      propertyId: p5.id,
    },
  });

  // ── Contracts ──────────────────────────────────────────────────────────────
  // t1 – aktywna bezterminowa
  await prisma.contract.create({
    data: {
      tenantId: t1.id,
      rentAmount: 2800,
      startDate: new Date("2024-01-01"),
      endDate: null,
      isActive: true,
    },
  });
  // t2 – aktywna bezterminowa
  await prisma.contract.create({
    data: {
      tenantId: t2.id,
      rentAmount: 2200,
      startDate: new Date("2023-09-01"),
      endDate: null,
      isActive: true,
    },
  });
  // t3 – zakończona
  await prisma.contract.create({
    data: {
      tenantId: t3.id,
      rentAmount: 3500,
      startDate: new Date("2024-06-01"),
      endDate: new Date("2025-05-31"),
      isActive: false,
    },
  });
  // t4 – aktywna
  await prisma.contract.create({
    data: {
      tenantId: t4.id,
      rentAmount: 2600,
      startDate: new Date("2025-03-01"),
      endDate: null,
      isActive: true,
    },
  });
  // t5 – aktywna terminowa
  await prisma.contract.create({
    data: {
      tenantId: t5.id,
      rentAmount: 1900,
      startDate: new Date("2025-07-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });
  // t6 – stara zakończona umowa (lokal)
  await prisma.contract.create({
    data: {
      tenantId: t6.id,
      rentAmount: 4200,
      startDate: new Date("2022-03-01"),
      endDate: new Date("2025-02-28"),
      isActive: false,
    },
  });
  // t7 – nowa od 2026-02-01
  await prisma.contract.create({
    data: {
      tenantId: t7.id,
      rentAmount: 2400,
      startDate: new Date("2026-02-01"),
      endDate: null,
      isActive: true,
    },
  });

  // ── Invoices ───────────────────────────────────────────────────────────────
  // Helper: create RENT invoice
  async function rent(tenantId: number, amount: number, month: number, year: number) {
    return prisma.invoice.create({
      data: { tenantId, type: "RENT", amount, month, year },
    });
  }
  // Helper: create MEDIA invoice
  async function media(tenantId: number, amount: number, month: number, year: number) {
    return prisma.invoice.create({
      data: { tenantId, type: "MEDIA", amount, month, year },
    });
  }

  // Aktywni najemcy: t1, t2, t4, t5, t7 (t3 i t6 historyczni)

  // --- Historia: lip–gru 2025 (t1, t2, t4) + t5 od lip, t6 do lut 2025
  for (const m of [7, 8, 9, 10, 11, 12]) {
    await rent(t1.id, 2800, m, 2025);
    await rent(t2.id, 2200, m, 2025);
    // t4 aktywna od 2025-03
    await rent(t4.id, 2600, m, 2025);
    // t5 aktywna od 2025-07
    await rent(t5.id, 1900, m, 2025);
  }
  // t4 mar–cze 2025
  for (const m of [3, 4, 5, 6]) {
    await rent(t4.id, 2600, m, 2025);
  }
  // t6 styczeń–luty 2025 (ostatnie miesiące zakończonej umowy)
  await rent(t6.id, 4200, 1, 2025);
  await rent(t6.id, 4200, 2, 2025);

  // --- Rok 2026: sty + lut
  for (const m of [1, 2]) {
    await rent(t1.id, 2800, m, 2026);
    await rent(t2.id, 2200, m, 2026);
    await rent(t4.id, 2600, m, 2026);
    await rent(t5.id, 1900, m, 2026);
  }
  // t7 od lutego
  await rent(t7.id, 2400, 2, 2026);

  // --- Marzec 2026 (bieżący miesiąc) – wystawione, nie wszystkie zapłacone
  await rent(t1.id, 2800, 3, 2026);
  await rent(t2.id, 2200, 3, 2026);
  await rent(t4.id, 2600, 3, 2026);
  await rent(t5.id, 1900, 3, 2026);
  await rent(t7.id, 2400, 3, 2026);

  // --- MEDIA: wybrane miesiące ───────────────────────────────────────────────
  // t1 – media co kwartał (Q3, Q4 2025, Q1 2026)
  await media(t1.id, 340, 9, 2025);
  await media(t1.id, 410, 12, 2025);
  await media(t1.id, 380, 3, 2026);
  // t2
  await media(t2.id, 280, 9, 2025);
  await media(t2.id, 320, 12, 2025);
  await media(t2.id, 295, 3, 2026);
  // t4
  await media(t4.id, 260, 9, 2025);
  await media(t4.id, 310, 12, 2025);
  // t5 – media za sty 2026
  await media(t5.id, 180, 1, 2026);

  // ── Transactions ───────────────────────────────────────────────────────────
  // 2025 – Historia płatności (wybrane miesiące)

  // t1 – zawsze płaci terminowo przelewem
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

  // t2 – regularnie, ale czasem kilka dni późno
  for (const [day, month, year] of [
    [8, 7, 2025], [10, 8, 2025], [7, 9, 2025], [12, 10, 2025], [9, 11, 2025], [8, 12, 2025],
    [7, 1, 2026], [6, 2, 2026],
    // Marzec 2026 – jeszcze nie zapłacone (brak transakcji)
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

  // t4 – płaci gotówką, sporadycznie przelewem
  for (const [day, month, year, cash] of [
    [2, 7, 2025, true], [4, 8, 2025, false], [3, 9, 2025, true],
    [2, 10, 2025, true], [3, 11, 2025, false], [2, 12, 2025, true],
    [3, 1, 2026, false], [3, 2, 2026, true], [2, 3, 2026, false],
  ] as [number, number, number, boolean][]) {
    await prisma.transaction.create({
      data: {
        type: cash ? "CASH" : "BANK",
        status: cash ? "MANUAL" : "MATCHED",
        amount: 2600,
        date: new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`),
        title: `Czynsz ${month}/${year} Zielinska`,
        bankAccount: cash ? null : "PL72 1020 4476 0000 8102 0063 1234",
        description: cash ? "Zapłacone osobiście" : null,
        tenantId: t4.id,
      },
    });
  }

  // t5 – płaci z opóźnieniem, jeden miesiąc brakuje (sty 2026 UNMATCHED bo brak konta)
  for (const [day, month, year] of [
    [18, 7, 2025], [20, 8, 2025], [15, 9, 2025], [22, 10, 2025], [19, 11, 2025], [17, 12, 2025],
    // Sty 2026 – przelew bez dopasowania (niejasny tytuł)
  ] as [number, number, number][]) {
    await prisma.transaction.create({
      data: {
        type: "BANK",
        status: "MATCHED",
        amount: 1900,
        date: new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`),
        title: `Wynajem ${month}/${year} Wróbel`,
        bankAccount: "PL55 2490 0005 0000 4500 7890 4321",
        tenantId: t5.id,
      },
    });
  }
  // t5 – styczeń 2026 – przelew nie dopasowany (niejasny tytuł, brak tenantId)
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "UNMATCHED",
      amount: 1900,
      date: new Date("2026-01-15"),
      title: "Wynajem mieszkanie styczen",
      bankAccount: "PL55 2490 0005 0000 4500 7890 4321",
      tenantId: null,
    },
  });
  // t5 – luty 2026 dopasowany
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "MATCHED",
      amount: 1900,
      date: new Date("2026-02-18"),
      title: "Czynsz luty 2026 Wróbel",
      bankAccount: "PL55 2490 0005 0000 4500 7890 4321",
      tenantId: t5.id,
    },
  });
  // t5 – marzec 2026 – jeszcze nie zapłacił

  // t7 – nowy najemca, zapłacił za luty, marzec w toku
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "MATCHED",
      amount: 2400,
      date: new Date("2026-02-05"),
      title: "Czynsz luty 2026 - Lewandowska",
      bankAccount: "PL33 1600 1462 1800 0002 9101 5555",
      tenantId: t7.id,
    },
  });
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "MATCHED",
      amount: 2400,
      date: new Date("2026-03-04"),
      title: "Czynsz marzec 2026 - Lewandowska",
      bankAccount: "PL33 1600 1462 1800 0002 9101 5555",
      tenantId: t7.id,
    },
  });

  // t6 – ostatnie płatności przed zakończeniem umowy
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "MATCHED",
      amount: 4200,
      date: new Date("2025-01-08"),
      title: "Czynsz styczeń 2025 XYZ Sp z oo",
      bankAccount: "PL11 1750 0012 0000 0022 3333 4444",
      tenantId: t6.id,
    },
  });
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "MATCHED",
      amount: 4200,
      date: new Date("2025-02-10"),
      title: "Czynsz luty 2025 XYZ Sp z oo",
      bankAccount: "PL11 1750 0012 0000 0022 3333 4444",
      tenantId: t6.id,
    },
  });

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

  // Nieznane przelewy (UNMATCHED)
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "UNMATCHED",
      amount: 500,
      date: new Date("2026-02-20"),
      title: "Przelew od nieznajomego",
      bankAccount: "PL99 1234 5678 9012 3456 7890 1234",
      tenantId: null,
    },
  });
  await prisma.transaction.create({
    data: {
      type: "BANK",
      status: "UNMATCHED",
      amount: 2200,
      date: new Date("2026-03-10"),
      title: "Wplata czynsz marzec",
      bankAccount: "PL83 1140 2004 0000 3002 0135 5387",
      tenantId: null,
      description: "Prawdopodobnie Wiśniewska – do weryfikacji",
    },
  });
  // Korekta
  await prisma.transaction.create({
    data: {
      type: "ADJUSTMENT",
      status: "MANUAL",
      amount: -150,
      date: new Date("2025-11-30"),
      title: "Korekta – nadpłata media Q3 t1",
      bankAccount: null,
      tenantId: t1.id,
      description: "Zwrot nadpłaty za media Q3 2025",
    },
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
