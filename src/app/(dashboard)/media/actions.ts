"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSettlementGroups() {
  return prisma.settlementGroup.findMany({
    include: {
      property: { select: { address: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getPropertiesForSelect() {
  return prisma.property.findMany({
    orderBy: { address: "asc" },
    select: { id: true, address: true },
  });
}

export async function createSettlementGroup(formData: FormData) {
  const name = formData.get("name") as string;
  const spreadsheetId = formData.get("spreadsheetId") as string;
  const inputMappingJSON = formData.get("inputMappingJSON") as string;
  const outputMappingJSON = formData.get("outputMappingJSON") as string;
  const propertyId = Number(formData.get("propertyId"));

  if (!name || !spreadsheetId || !propertyId) {
    return { error: "Wypełnij wszystkie wymagane pola." };
  }

  // Validate JSON fields
  try {
    JSON.parse(inputMappingJSON || "[]");
    JSON.parse(outputMappingJSON || "[]");
  } catch {
    return { error: "Nieprawidłowy format JSON w mapowaniach." };
  }

  await prisma.settlementGroup.create({
    data: {
      name,
      spreadsheetId,
      inputMappingJSON: inputMappingJSON || "[]",
      outputMappingJSON: outputMappingJSON || "[]",
      propertyId,
    },
  });

  revalidatePath("/media");
  return {};
}

export async function updateSettlementGroup(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const spreadsheetId = formData.get("spreadsheetId") as string;
  const inputMappingJSON = formData.get("inputMappingJSON") as string;
  const outputMappingJSON = formData.get("outputMappingJSON") as string;
  const propertyId = Number(formData.get("propertyId"));

  if (!name || !spreadsheetId || !propertyId) {
    return { error: "Wypełnij wszystkie wymagane pola." };
  }

  try {
    JSON.parse(inputMappingJSON || "[]");
    JSON.parse(outputMappingJSON || "[]");
  } catch {
    return { error: "Nieprawidłowy format JSON w mapowaniach." };
  }

  await prisma.settlementGroup.update({
    where: { id },
    data: {
      name,
      spreadsheetId,
      inputMappingJSON: inputMappingJSON || "[]",
      outputMappingJSON: outputMappingJSON || "[]",
      propertyId,
    },
  });

  revalidatePath("/media");
  return {};
}

export async function deleteSettlementGroup(id: number) {
  await prisma.settlementGroup.delete({ where: { id } });
  revalidatePath("/media");
  return {};
}
