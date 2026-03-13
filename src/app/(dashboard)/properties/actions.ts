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
  const address = formData.get("address") as string;
  const type = formData.get("type") as string;

  if (!address?.trim() || !type?.trim()) {
    return { error: "Adres i typ lokalu są wymagane." };
  }

  await prisma.property.create({
    data: { address: address.trim(), type: type.trim() },
  });

  revalidatePath("/properties");
  return { success: true };
}

export async function updateProperty(id: number, formData: FormData) {
  const address = formData.get("address") as string;
  const type = formData.get("type") as string;

  if (!address?.trim() || !type?.trim()) {
    return { error: "Adres i typ lokalu są wymagane." };
  }

  await prisma.property.update({
    where: { id },
    data: { address: address.trim(), type: type.trim() },
  });

  revalidatePath("/properties");
  return { success: true };
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
