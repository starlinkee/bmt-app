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
