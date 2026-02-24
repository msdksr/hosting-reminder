import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user;
  const isClient = user.role === "CLIENT";
  const clientId = user.clientId;

  try {
    const [
      totalClients,
      totalServices,
      remindersSentToday,
      failedReminders,
    ] = await Promise.all([
      isClient ? 1 : prisma.client.count(),
      prisma.service.count({
        where: isClient ? { clientId: clientId as number } : {},
      }),
      prisma.reminderLog.count({
        where: {
          status: "sent",
          sentAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          ...(isClient ? { clientId: clientId as number } : {}),
        },
      }),
      prisma.reminderLog.count({
        where: { 
          status: "failed",
          ...(isClient ? { clientId: clientId as number } : {}),
        },
      }),
    ]);

    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const upcomingExpirations = await prisma.service.findMany({
      where: {
        expiryDate: { gte: today, lte: sevenDaysLater },
        status: { not: "renewed" },
        ...(isClient ? { clientId: clientId as number } : {}),
      },
      include: { client: true },
      orderBy: { expiryDate: "asc" },
      take: 10,
    });

    const recentLogs = await prisma.reminderLog.findMany({
      where: isClient ? { clientId: clientId as number } : {},
      include: { client: true, service: true },
      orderBy: { sentAt: "desc" },
      take: 8,
    });

    const expiringThisWeek = upcomingExpirations.length;

    return NextResponse.json({
      totalClients,
      totalServices,
      expiringThisWeek,
      remindersSentToday,
      failedReminders,
      upcomingExpirations,
      recentLogs,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}

