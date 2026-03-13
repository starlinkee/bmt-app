"use server";

import { prisma } from "@/lib/prisma";
import { parseBankCsv, type ParsedTransaction } from "@/lib/csvParser";
import { matchTransaction } from "@/lib/matcher";
import { revalidatePath } from "next/cache";

export async function importCsvTransactions(csvContent: string) {
  const result = parseBankCsv(csvContent);

  if (!result.success) {
    return { error: result.error };
  }

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      bankAccountsAsText: true,
    },
  });

  let matched = 0;
  let unmatched = 0;
  let skipped = 0;

  const transactionsToCreate: {
    type: "BANK";
    status: "MATCHED" | "UNMATCHED";
    amount: number;
    date: Date;
    title: string;
    bankAccount: string;
    tenantId: number | null;
  }[] = [];

  for (const tx of result.transactions) {
    // Skip transactions with 0 amount
    if (tx.amount === 0) {
      skipped++;
      continue;
    }

    const match = matchTransaction(tx.bankAccount, tenants);

    transactionsToCreate.push({
      type: "BANK",
      status: match.tenantId ? "MATCHED" : "UNMATCHED",
      amount: tx.amount,
      date: new Date(tx.date),
      title: tx.title,
      bankAccount: tx.bankAccount || "",
      tenantId: match.tenantId,
    });

    if (match.tenantId) {
      matched++;
    } else {
      unmatched++;
    }
  }

  if (transactionsToCreate.length > 0) {
    // Create in batches to avoid SQLite limits
    const BATCH_SIZE = 50;
    for (let i = 0; i < transactionsToCreate.length; i += BATCH_SIZE) {
      const batch = transactionsToCreate.slice(i, i + BATCH_SIZE);
      await prisma.transaction.createMany({
        data: batch,
      });
    }
  }

  revalidatePath("/import");
  revalidatePath("/import/reconcile");
  revalidatePath("/tenants");

  return {
    bankName: result.bankName,
    total: result.totalRows,
    matched,
    unmatched,
    skipped,
    created: transactionsToCreate.length,
  };
}

export async function getImportStats() {
  const [totalBank, totalMatched, totalUnmatched] = await Promise.all([
    prisma.transaction.count({ where: { type: "BANK" } }),
    prisma.transaction.count({ where: { type: "BANK", status: "MATCHED" } }),
    prisma.transaction.count({ where: { type: "BANK", status: "UNMATCHED" } }),
  ]);

  return { totalBank, totalMatched, totalUnmatched };
}

export async function getRecentImports() {
  return prisma.transaction.findMany({
    where: { type: "BANK" },
    include: {
      tenant: {
        select: { firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnmatchedTransactions() {
  return prisma.transaction.findMany({
    where: { type: "BANK", status: "UNMATCHED" },
    orderBy: { date: "desc" },
  });
}

export async function getAllTenants() {
  return prisma.tenant.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      bankAccountsAsText: true,
      property: { select: { address: true } },
    },
    orderBy: { lastName: "asc" },
  });
}

export async function reconcileTransaction(
  transactionId: number,
  tenantId: number,
  saveAccount: boolean
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    return { error: "Transakcja nie została znaleziona." };
  }

  if (transaction.status !== "UNMATCHED") {
    return { error: "Transakcja jest już przypisana." };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return { error: "Najemca nie został znaleziony." };
  }

  // Update transaction
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      tenantId,
      status: "MATCHED",
    },
  });

  // Optionally save the bank account to tenant's known accounts
  if (saveAccount && transaction.bankAccount) {
    const existingAccounts = tenant.bankAccountsAsText
      .split(/[\n,;]+/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    const normalizedNew = transaction.bankAccount.replace(/[\s\-]/g, "");
    const alreadyExists = existingAccounts.some(
      (a) => a.replace(/[\s\-]/g, "") === normalizedNew
    );

    if (!alreadyExists) {
      const updatedAccounts = existingAccounts.length > 0
        ? `${tenant.bankAccountsAsText}\n${transaction.bankAccount}`
        : transaction.bankAccount;

      await prisma.tenant.update({
        where: { id: tenantId },
        data: { bankAccountsAsText: updatedAccounts },
      });
    }
  }

  revalidatePath("/import");
  revalidatePath("/import/reconcile");
  revalidatePath("/tenants");

  return { success: true };
}
