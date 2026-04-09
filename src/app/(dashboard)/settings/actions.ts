"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getAppConfig() {
  return prisma.appConfig.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export async function updateAppConfig(formData: FormData) {
  const rentInvoiceSpreadsheetId = (formData.get("rentInvoiceSpreadsheetId") as string) ?? "";
  const rentInvoiceInputMappingJSON = (formData.get("rentInvoiceInputMappingJSON") as string) ?? "[]";
  const rentInvoicePdfGid = (formData.get("rentInvoicePdfGid") as string) ?? "";

  try {
    const parsed = JSON.parse(rentInvoiceInputMappingJSON);
    if (!Array.isArray(parsed)) return { error: "Mapowanie musi być tablicą JSON." };
    for (const item of parsed) {
      if (typeof item.range !== "string" || typeof item.value !== "string") {
        return { error: 'Każdy element mapowania musi mieć pola "range" (string) i "value" (string).' };
      }
    }
  } catch {
    return { error: "Mapowanie wejściowe zawiera niepoprawny JSON." };
  }

  await prisma.appConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      rentInvoiceSpreadsheetId,
      rentInvoiceInputMappingJSON,
      rentInvoicePdfGid,
    },
    update: {
      rentInvoiceSpreadsheetId,
      rentInvoiceInputMappingJSON,
      rentInvoicePdfGid,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}
