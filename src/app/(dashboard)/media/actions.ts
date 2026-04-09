"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Usuwa znaki kontrolne które mogą wkleić się przy kopiowaniu z przeglądarki */
// eslint-disable-next-line no-control-regex
function cleanJSON(raw: string): string {
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

export async function getSettlementGroups() {
  return prisma.settlementGroup.findMany({
    include: {
      properties: {
        include: { property: { select: { address: true } } },
      },
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
  const inputMappingJSON = cleanJSON(formData.get("inputMappingJSON") as string ?? "");
  const outputMappingJSON = cleanJSON(formData.get("outputMappingJSON") as string ?? "");
  const propertyIds = formData.getAll("propertyIds").map(Number).filter(Boolean);

  if (!name || !spreadsheetId || propertyIds.length === 0) {
    return { error: "Wypełnij wszystkie wymagane pola." };
  }

  try {
    JSON.parse(inputMappingJSON || "[]");
  } catch (e) {
    return { error: `Nieprawidłowy JSON w inputMapping: ${e instanceof Error ? e.message : e}` };
  }
  try {
    JSON.parse(outputMappingJSON || "[]");
  } catch (e) {
    return { error: `Nieprawidłowy JSON w outputMapping: ${e instanceof Error ? e.message : e}` };
  }

  await prisma.settlementGroup.create({
    data: {
      name,
      spreadsheetId,
      inputMappingJSON: inputMappingJSON || "[]",
      outputMappingJSON: outputMappingJSON || "[]",
      properties: {
        create: propertyIds.map((propertyId) => ({ propertyId })),
      },
    },
  });

  revalidatePath("/media");
  return {};
}

export async function updateSettlementGroup(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const spreadsheetId = formData.get("spreadsheetId") as string;
  const inputMappingJSON = cleanJSON(formData.get("inputMappingJSON") as string ?? "");
  const outputMappingJSON = cleanJSON(formData.get("outputMappingJSON") as string ?? "");
  const propertyIds = formData.getAll("propertyIds").map(Number).filter(Boolean);

  if (!name || !spreadsheetId || propertyIds.length === 0) {
    return { error: "Wypełnij wszystkie wymagane pola." };
  }

  try {
    JSON.parse(inputMappingJSON || "[]");
  } catch (e) {
    return { error: `Nieprawidłowy JSON w inputMapping: ${e instanceof Error ? e.message : e}` };
  }
  try {
    JSON.parse(outputMappingJSON || "[]");
  } catch (e) {
    return { error: `Nieprawidłowy JSON w outputMapping: ${e instanceof Error ? e.message : e}` };
  }

  await prisma.$transaction([
    prisma.settlementGroupProperty.deleteMany({ where: { settlementGroupId: id } }),
    prisma.settlementGroup.update({
      where: { id },
      data: {
        name,
        spreadsheetId,
        inputMappingJSON: inputMappingJSON || "[]",
        outputMappingJSON: outputMappingJSON || "[]",
        properties: {
          create: propertyIds.map((propertyId) => ({ propertyId })),
        },
      },
    }),
  ]);

  revalidatePath("/media");
  return {};
}

export async function deleteSettlementGroup(id: number) {
  await prisma.settlementGroup.delete({ where: { id } });
  revalidatePath("/media");
  return {};
}
