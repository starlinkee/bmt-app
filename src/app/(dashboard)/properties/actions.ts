"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProperties() {
  return prisma.property.findMany({
    include: { _count: { select: { tenants: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createProperty(formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const type = formData.get("type") as string;

  if (!address?.trim() || !type?.trim()) {
    return { error: "Adres i typ lokalu są wymagane." };
  }

  await prisma.property.create({
    data: { name: (name ?? "").trim(), address: address.trim(), type: type.trim() },
  });

  revalidatePath("/properties");
  return { success: true };
}

export async function updateProperty(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string;
  const type = formData.get("type") as string;

  if (!address?.trim() || !type?.trim()) {
    return { error: "Adres i typ lokalu są wymagane." };
  }

  await prisma.property.update({
    where: { id },
    data: { name: (name ?? "").trim(), address: address.trim(), type: type.trim() },
  });

  revalidatePath("/properties");
  return { success: true };
}

export async function getTenantsByProperty(propertyId: number) {
  return prisma.tenant.findMany({
    where: { propertyId },
    orderBy: { lastName: "asc" },
  });
}

export async function deleteProperty(id: number) {
  const tenantCount = await prisma.tenant.count({ where: { propertyId: id } });
  if (tenantCount > 0) {
    return { error: "Nie można usunąć nieruchomości z przypisanymi najemcami." };
  }

  await prisma.property.delete({ where: { id } });
  revalidatePath("/properties");
  return { success: true };
}
