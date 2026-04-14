import { prisma } from "@/lib/prisma";

export async function ensureMonthlyTasks(month: number, year: number) {
  await Promise.all([
    prisma.monthlyTask.upsert({
      where: { type_month_year: { type: "RENT", month, year } },
      create: { type: "RENT", month, year },
      update: {},
    }),
    prisma.monthlyTask.upsert({
      where: { type_month_year: { type: "MEDIA", month, year } },
      create: { type: "MEDIA", month, year },
      update: {},
    }),
  ]);
}

export async function markMonthlyTaskDone(
  type: "RENT" | "MEDIA",
  month: number,
  year: number
) {
  await prisma.monthlyTask.upsert({
    where: { type_month_year: { type, month, year } },
    create: { type, month, year, status: "DONE", completedAt: new Date() },
    update: { status: "DONE", completedAt: new Date() },
  });
}
