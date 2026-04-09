"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getContracts() {
  return prisma.contract.findMany({
    include: {
      tenant: {
        include: { property: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTenantsForSelect() {
  return prisma.tenant.findMany({
    select: { id: true, firstName: true, lastName: true, property: { select: { address: true } } },
    orderBy: { lastName: "asc" },
  });
}

export async function createContract(formData: FormData) {
  const tenantId = Number(formData.get("tenantId"));
  const rentAmount = parseFloat(formData.get("rentAmount") as string);
  const invoiceSeqNumber = Number(formData.get("invoiceSeqNumber")) || 0;
  const startDate = formData.get("startDate") as string;
  const endDate = (formData.get("endDate") as string) || null;
  const isActive = formData.get("isActive") === "on";

  if (!tenantId) return { error: "Najemca jest wymagany." };
  if (!rentAmount || rentAmount <= 0) return { error: "Kwota czynszu musi być większa od 0." };
  if (!startDate) return { error: "Data rozpoczęcia jest wymagana." };

  await prisma.contract.create({
    data: {
      tenantId,
      rentAmount,
      invoiceSeqNumber,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isActive,
    },
  });

  revalidatePath("/contracts");
  return { success: true };
}

export async function updateContract(id: number, formData: FormData) {
  const tenantId = Number(formData.get("tenantId"));
  const rentAmount = parseFloat(formData.get("rentAmount") as string);
  const invoiceSeqNumber = Number(formData.get("invoiceSeqNumber")) || 0;
  const startDate = formData.get("startDate") as string;
  const endDate = (formData.get("endDate") as string) || null;
  const isActive = formData.get("isActive") === "on";

  if (!tenantId) return { error: "Najemca jest wymagany." };
  if (!rentAmount || rentAmount <= 0) return { error: "Kwota czynszu musi być większa od 0." };
  if (!startDate) return { error: "Data rozpoczęcia jest wymagana." };

  await prisma.contract.update({
    where: { id },
    data: {
      tenantId,
      rentAmount,
      invoiceSeqNumber,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isActive,
    },
  });

  revalidatePath("/contracts");
  return { success: true };
}

export async function deleteContract(id: number) {
  try {
    await prisma.contract.delete({ where: { id } });
  } catch {
    return { error: "Nie udało się usunąć umowy." };
  }
  revalidatePath("/contracts");
  return { success: true };
}
