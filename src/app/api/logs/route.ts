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
    const logs = await prisma.reminderLog.findMany({
      where: isClient ? { clientId: clientId as number } : {},
      include: {
        client: { select: { id: true, name: true, email: true } },
        service: { select: { id: true, domainName: true, serviceType: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 200,
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Logs fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
