"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTenants() {
  return prisma.tenant.findMany({
    include: { property: true, _count: { select: { contracts: { where: { isActive: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getContractsByTenant(tenantId: number) {
  return prisma.contract.findMany({
    where: { tenantId, isActive: true },
    orderBy: { startDate: "desc" },
  });
}

export async function getPropertiesForSelect() {
  return prisma.property.findMany({
    select: { id: true, address: true, type: true },
    orderBy: { address: "asc" },
  });
}

export async function createTenant(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const bankAccountsAsText = (formData.get("bankAccountsAsText") as string) || "";
  const propertyId = Number(formData.get("propertyId"));

  if (!firstName?.trim() || !lastName?.trim()) {
    return { error: "Imię i nazwisko są wymagane." };
  }
  if (!propertyId) {
    return { error: "Nieruchomość jest wymagana." };
  }

  await prisma.tenant.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      bankAccountsAsText: bankAccountsAsText.trim(),
      propertyId,
    },
  });

  revalidatePath("/tenants");
  return { success: true };
}

export async function updateTenant(id: number, formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = (formData.get("email") as string) || null;
  const phone = (formData.get("phone") as string) || null;
  const bankAccountsAsText = (formData.get("bankAccountsAsText") as string) || "";
  const propertyId = Number(formData.get("propertyId"));

  if (!firstName?.trim() || !lastName?.trim()) {
    return { error: "Imię i nazwisko są wymagane." };
  }
  if (!propertyId) {
    return { error: "Nieruchomość jest wymagana." };
  }

  await prisma.tenant.update({
    where: { id },
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      bankAccountsAsText: bankAccountsAsText.trim(),
      propertyId,
    },
  });

  revalidatePath("/tenants");
  return { success: true };
}

export async function deleteTenant(id: number) {
  const contractCount = await prisma.contract.count({ where: { tenantId: id } });
  if (contractCount > 0) {
    return { error: "Nie można usunąć najemcy z aktywnymi umowami." };
  }

  await prisma.tenant.delete({ where: { id } });
  revalidatePath("/tenants");
  return { success: true };
}
