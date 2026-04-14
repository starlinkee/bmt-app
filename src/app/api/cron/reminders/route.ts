import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/email";

// Called by system cron every hour:
//   curl -s -H "Authorization: Bearer <CRON_SECRET>" https://yourdomain/api/cron/reminders

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentDay = now.getDate();
  const currentHour = now.getHours();

  const reminders = await prisma.reminderSchedule.findMany({
    where: { isActive: true, dayOfMonth: currentDay, hour: currentHour },
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

  const results: Array<{ id: number; name: string; sent: number; skipped: number }> = [];

  for (const reminder of reminders) {
    // Skip if already sent this month
    if (reminder.lastSentAt) {
      const lastSent = new Date(reminder.lastSentAt);
      if (
        lastSent.getMonth() === now.getMonth() &&
        lastSent.getFullYear() === now.getFullYear()
      ) {
        continue;
      }
    }

    const withEmail = reminder.tenants.filter((rt) => rt.tenant.email);
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
      where: { id: reminder.id },
      data: { lastSentAt: now },
    });

    results.push({
      id: reminder.id,
      name: reminder.name,
      sent,
      skipped: reminder.tenants.length - withEmail.length,
    });
  }

  return NextResponse.json({ processed: results.length, results });
}
