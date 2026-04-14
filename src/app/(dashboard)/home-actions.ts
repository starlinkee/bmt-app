"use server";

import { prisma } from "@/lib/prisma";
import { ensureMonthlyTasks } from "@/lib/tasks";

async function getStats(month: number, year: number) {
  const [activeContracts, rents] = await Promise.all([
    prisma.contract.count({ where: { isActive: true } }),
    prisma.invoice.findMany({
      where: { type: "RENT", month, year },
      select: { amount: true },
    }),
  ]);
  return {
    activeContracts,
    rentsCount: rents.length,
    rentsTotal: rents.reduce((sum, r) => sum + r.amount, 0),
  };
}

export async function initAndGetPageData(filter: "TODO" | "DONE") {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await ensureMonthlyTasks(month, year);

  const startOfMonth = new Date(year, month - 1, 1);

  const [tasks, reminders, stats] = await Promise.all([
    prisma.monthlyTask.findMany({
      where: { status: filter },
      orderBy: [{ year: "desc" }, { month: "desc" }, { type: "asc" }],
    }),
    prisma.reminderSchedule.findMany({
      where: { isActive: true },
      orderBy: { dayOfMonth: "asc" },
    }),
    getStats(month, year),
  ]);

  const filteredReminders = reminders.filter((r) => {
    const sentThisMonth = r.lastSentAt !== null && r.lastSentAt >= startOfMonth;
    return filter === "DONE" ? sentThisMonth : !sentThisMonth;
  });

  return { tasks, reminders: filteredReminders, month, year, stats };
}

export async function getPageData(filter: "TODO" | "DONE") {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, month - 1, 1);

  const [tasks, reminders, stats] = await Promise.all([
    prisma.monthlyTask.findMany({
      where: { status: filter },
      orderBy: [{ year: "desc" }, { month: "desc" }, { type: "asc" }],
    }),
    prisma.reminderSchedule.findMany({
      where: { isActive: true },
      orderBy: { dayOfMonth: "asc" },
    }),
    getStats(month, year),
  ]);

  const filteredReminders = reminders.filter((r) => {
    const sentThisMonth = r.lastSentAt !== null && r.lastSentAt >= startOfMonth;
    return filter === "DONE" ? sentThisMonth : !sentThisMonth;
  });

  return { tasks, reminders: filteredReminders, month, year, stats };
}
