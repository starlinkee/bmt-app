import { prisma } from "@/lib/prisma";

export type StatementEntry = {
  id: number;
  date: Date;
  description: string;
  amount: number;
  runningBalance: number;
  entryType: "invoice" | "transaction";
  invoiceType?: string;
  transactionType?: string;
  transactionStatus?: string;
  isPaid?: boolean; // only for invoices — simulated
  month?: number;
  year?: number;
};

export async function getStatement(tenantId: number): Promise<StatementEntry[]> {
  const [invoices, transactions] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: [{ year: "asc" }, { month: "asc" }, { createdAt: "asc" }],
    }),
    prisma.transaction.findMany({
      where: { tenantId },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  // Build unified entries sorted chronologically
  const entries: StatementEntry[] = [];

  for (const inv of invoices) {
    const monthNames = [
      "Sty", "Lut", "Mar", "Kwi", "Maj", "Cze",
      "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru",
    ];
    const typeLabel =
      inv.type === "RENT" ? "Czynsz" :
      inv.type === "MEDIA" ? "Media" : "Inne";

    entries.push({
      id: inv.id,
      date: inv.createdAt,
      description: `${typeLabel} — ${monthNames[inv.month - 1]} ${inv.year}`,
      amount: -inv.amount, // invoices reduce balance
      runningBalance: 0,
      entryType: "invoice",
      invoiceType: inv.type,
      isPaid: false,
      month: inv.month,
      year: inv.year,
    });
  }

  for (const tx of transactions) {
    const typeLabel =
      tx.type === "BANK" ? "Przelew" :
      tx.type === "CASH" ? "Gotówka" : "Korekta";

    entries.push({
      id: tx.id,
      date: tx.date,
      description: tx.type === "ADJUSTMENT"
        ? `${typeLabel}: ${tx.description ?? tx.title}`
        : `${typeLabel}: ${tx.title}`,
      amount: tx.amount, // transactions add to balance
      runningBalance: 0,
      entryType: "transaction",
      transactionType: tx.type,
      transactionStatus: tx.status,
    });
  }

  // Sort chronologically (oldest first)
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate running balance and simulate invoice payment status
  // Logic: walk through entries, track cumulative balance.
  // After processing all entries, walk backwards through invoices
  // to mark which ones are "paid" based on remaining balance.

  let runningBalance = 0;
  for (const entry of entries) {
    runningBalance += entry.amount;
    entry.runningBalance = runningBalance;
  }

  // Simulate payment status on invoices:
  // Start from the final balance. If balance >= 0, all invoices paid.
  // If balance < 0, mark newest invoices as unpaid first (oldest get priority).
  const invoiceEntries = entries.filter((e) => e.entryType === "invoice");

  // Total balance = sum of all transactions - sum of all invoices
  // We already have the final runningBalance
  let remainingCredit = runningBalance;

  // Walk invoices from newest to oldest — unpaid ones come off the top
  // But actually we want oldest paid first, so:
  // Walk from oldest to newest, "spend" credit on each invoice
  const totalInvoiceAmount = invoiceEntries.reduce((s, e) => s + Math.abs(e.amount), 0);
  let creditPool = totalInvoiceAmount + runningBalance; // how much "credit" covers invoices

  for (const inv of invoiceEntries) {
    const cost = Math.abs(inv.amount);
    if (creditPool >= cost) {
      inv.isPaid = true;
      creditPool -= cost;
    } else {
      inv.isPaid = false;
      creditPool = 0;
    }
  }

  return entries;
}
