"use server";

import { prisma } from "@/lib/prisma";
import { ensureMonthlyTasks } from "@/lib/tasks";

export async function initAndGetPageData(filter: "TODO" | "DONE") {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  await ensureMonthlyTasks(month, year);

  const startOfMonth = new Date(year, month - 1, 1);

  const [tasks, reminders] = await Promise.all([
    prisma.monthlyTask.findMany({
      where: { status: filter },
      orderBy: [{ year: "desc" }, { month: "desc" }, { type: "asc" }],
    }),
    prisma.reminderSchedule.findMany({
      where: { isActive: true },
      orderBy: { dayOfMonth: "asc" },
    }),
  ]);

  const filteredReminders = reminders.filter((r) => {
    const sentThisMonth = r.lastSentAt !== null && r.lastSentAt >= startOfMonth;
    return filter === "DONE" ? sentThisMonth : !sentThisMonth;
  });

  return { tasks, reminders: filteredReminders, month, year };
}

export async function getPageData(filter: "TODO" | "DONE") {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const startOfMonth = new Date(year, month - 1, 1);

  const [tasks, reminders] = await Promise.all([
    prisma.monthlyTask.findMany({
      where: { status: filter },
      orderBy: [{ year: "desc" }, { month: "desc" }, { type: "asc" }],
    }),
    prisma.reminderSchedule.findMany({
      where: { isActive: true },
      orderBy: { dayOfMonth: "asc" },
    }),
  ]);

  const filteredReminders = reminders.filter((r) => {
    const sentThisMonth = r.lastSentAt !== null && r.lastSentAt >= startOfMonth;
    return filter === "DONE" ? sentThisMonth : !sentThisMonth;
  });

  return { tasks, reminders: filteredReminders, month, year };
}
