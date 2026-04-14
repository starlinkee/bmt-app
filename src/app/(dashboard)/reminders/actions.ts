"use server";

import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

export async function getReminders() {
  return prisma.reminderSchedule.findMany({
    include: {
      tenants: {
        include: {
          tenant: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAllTenants() {
  return prisma.tenant.findMany({
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function createReminder(data: {
  name: string;
  dayOfMonth: number;
  hour: number;
  subject: string;
  body: string;
  tenantIds: number[];
}) {
  await prisma.reminderSchedule.create({
    data: {
      name: data.name,
      dayOfMonth: data.dayOfMonth,
      hour: data.hour,
      subject: data.subject,
      body: data.body,
      tenants: {
        create: data.tenantIds.map((tenantId) => ({ tenantId })),
      },
    },
  });
  revalidatePath("/reminders");
}

export async function updateReminder(
  id: number,
  data: {
    name: string;
    dayOfMonth: number;
    hour: number;
    subject: string;
    body: string;
    tenantIds: number[];
  }
) {
  await prisma.$transaction([
    prisma.reminderTenant.deleteMany({ where: { reminderId: id } }),
    prisma.reminderSchedule.update({
      where: { id },
      data: {
        name: data.name,
        dayOfMonth: data.dayOfMonth,
        hour: data.hour,
        subject: data.subject,
        body: data.body,
        tenants: {
          create: data.tenantIds.map((tenantId) => ({ tenantId })),
        },
      },
    }),
  ]);
  revalidatePath("/reminders");
}

export async function toggleReminderActive(id: number, isActive: boolean) {
  await prisma.reminderSchedule.update({ where: { id }, data: { isActive } });
  revalidatePath("/reminders");
}

export async function deleteReminder(id: number) {
  await prisma.reminderSchedule.delete({ where: { id } });
  revalidatePath("/reminders");
}

export async function sendReminderNow(id: number) {
  const reminder = await prisma.reminderSchedule.findUnique({
    where: { id },
    include: {
      tenants: {
        include: {
          tenant: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  });

  if (!reminder) return { error: "Nie znaleziono przypomnienia." };

  const withEmail = reminder.tenants.filter((rt) => rt.tenant.email);
  if (withEmail.length === 0) {
    return { sent: 0, skipped: reminder.tenants.length, error: null };
  }

  let sent = 0;
  for (const rt of withEmail) {
    const ok = await sendReminderEmail({
      to: rt.tenant.email!,
      firstName: rt.tenant.firstName,
      lastName: rt.tenant.lastName,
      subject: reminder.subject,
      body: reminder.body,
    });
    if (ok) sent++;
  }

  await prisma.reminderSchedule.update({
    where: { id },
    data: { lastSentAt: new Date() },
  });

  revalidatePath("/reminders");
  return { sent, skipped: reminder.tenants.length - withEmail.length, error: null };
}
