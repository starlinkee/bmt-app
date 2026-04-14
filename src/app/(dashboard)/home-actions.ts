"use server";

import { prisma } from "@/lib/prisma";
import { ensureMonthlyTasks } from "@/lib/tasks";

export async function initAndGetTasks(filter: "TODO" | "DONE") {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await ensureMonthlyTasks(month, year);

  return prisma.monthlyTask.findMany({
    where: { status: filter },
    orderBy: [{ year: "desc" }, { month: "desc" }, { type: "asc" }],
  });
}

export async function getAllTasks(filter: "TODO" | "DONE") {
  return prisma.monthlyTask.findMany({
    where: { status: filter },
    orderBy: [{ year: "desc" }, { month: "desc" }, { type: "asc" }],
  });
}
