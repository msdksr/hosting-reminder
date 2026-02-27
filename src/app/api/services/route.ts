import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createPleskDomain } from "@/lib/plesk";

export async function GET() {
  // ... (keeping existing GET logic)
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

    // AUTO-CREATE IN PLESK IF HOSTING
    if (serviceType === "hosting" && service.client?.pleskId) {
      try {
        await createPleskDomain({
          name: domainName,
          client_id: service.client.pleskId,
          hosting_type: "virtual"
        });

        console.log(`Successfully created domain ${domainName} in Plesk`);
      } catch (pleskErr: any) {
        console.error("Failed to create domain in Plesk:", pleskErr.message);
        // We don't fail the whole request if Plesk sync fails, but we could return a warning
        return NextResponse.json({ 
          ...service, 
          pleskWarning: `Service created locally, but failed to create in Plesk: ${pleskErr.message}` 
        });
      }
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}