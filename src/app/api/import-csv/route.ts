
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { clients } = body;

    if (!Array.isArray(clients)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const created = await Promise.all(
      clients.map(async (c: any) => {
        return prisma.client.upsert({
          where: { email: c.email },
          update: {
            name: c.name,
            phone: c.phone,
            whatsappOptIn: c.whatsappOptIn ?? false,
            notes: c.notes,
          },
          create: {
            name: c.name,
            email: c.email,
            phone: c.phone,
            whatsappOptIn: c.whatsappOptIn ?? false,
            notes: c.notes,
          },
        });
      })
    );

    return NextResponse.json({ success: true, count: created.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to import clients" }, { status: 500 });
  }
}
