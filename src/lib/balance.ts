import { prisma } from "@/lib/prisma";

export async function calculateBalance(tenantId: number) {
  const [transactionAgg, invoiceAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { tenantId },
      _sum: { amount: true },
    }),
  ]);

  const totalTransactions = transactionAgg._sum.amount ?? 0;
  const totalInvoices = invoiceAgg._sum.amount ?? 0;

  return totalTransactions - totalInvoices;
}
