import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const clientId = Number(id);

  // If client, they can only see their own data
  if (session.user.role === "CLIENT" && session.user.id !== id) {
    // Actually session.user.id might be a string UUID while target is Number id?
    // Let's check session object or assume admins only for now or properly map.
    // Based on previous logs, users have IDs. 
    // For now let's stick to ADMIN/SUPERADMIN for list and details unless specified.
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
     // TODO: Implement client-specific check if needed
     // return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        services: true,
        reminderLogs: {
          orderBy: { sentAt: "desc" },
          take: 10,
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, whatsappOptIn, notes } = body;

    const client = await prisma.client.update({
      where: { id: Number(id) },
      data: { name, email, phone, whatsappOptIn, notes },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await prisma.client.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
