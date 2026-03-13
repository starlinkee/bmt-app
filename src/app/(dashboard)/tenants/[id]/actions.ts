"use server";

import { prisma } from "@/lib/prisma";
import { calculateBalance } from "@/lib/balance";
import { getStatement } from "@/lib/statement";

export async function getTenantDetail(id: number) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      property: true,
      contracts: {
        where: { isActive: true },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });

  if (!tenant) return null;

  const [balance, statement] = await Promise.all([
    calculateBalance(id),
    getStatement(id),
  ]);

  return {
    tenant,
    balance,
    statement,
  };
}

export async function createAdjustment(data: {
  tenantId: number;
  amount: number;
  description: string;
  date: string;
}) {
  if (!data.description || data.description.trim().length < 10) {
    throw new Error("Opis musi mieć minimum 10 znaków.");
  }
  if (data.amount === 0) {
    throw new Error("Kwota nie może wynosić 0.");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
  if (!tenant) {
    throw new Error("Najemca nie został znaleziony.");
  }

  await prisma.transaction.create({
    data: {
      type: "ADJUSTMENT",
      status: "MANUAL",
      amount: data.amount,
      date: new Date(data.date),
      title: "Korekta",
      description: data.description.trim(),
      tenantId: data.tenantId,
    },
  });
}
