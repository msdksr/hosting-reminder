import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
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
    const services = await prisma.service.findMany({
      where: isClient ? { clientId: clientId as number } : {},
      include: {
        client: { select: { id: true, name: true, email: true } },
        _count: { select: { reminders: true } },
      },
      orderBy: { expiryDate: "asc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { clientId, domainName, serviceType, expiryDate, price } = body;

    if (!clientId || !domainName || !serviceType || !expiryDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        clientId: Number(clientId),
        domainName,
        serviceType,
        expiryDate: new Date(expiryDate),
        price: Number(price) || 0,
      },
      include: { client: true },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}