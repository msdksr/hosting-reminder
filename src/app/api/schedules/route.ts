import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// GET all schedules
export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const schedules = await prisma.reminderSchedule.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(schedules);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

// POST create schedule
export async function POST(req: Request) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, daysBefore, channels, serviceTypes, emailTemplate, whatsappTemplate } = body;

    if (!daysBefore || !channels) {
      return NextResponse.json({ error: "daysBefore and channels are required" }, { status: 400 });
    }

    const schedule = await prisma.reminderSchedule.create({
      data: {
        name: name || "Default",
        daysBefore,
        channels,
        serviceTypes: serviceTypes || ["domain", "hosting", "ssl"],
        emailTemplate,
        whatsappTemplate,
      },
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}

// PUT update schedule
export async function PUT(req: Request) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const schedule = await prisma.reminderSchedule.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
  }
}
