import { NextResponse } from "next/server";
import { createPleskDomain } from "@/lib/plesk";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await props.params;
  try {
    const serviceId = parseInt(params.id);
    if (isNaN(serviceId)) {
      return NextResponse.json({ error: "Invalid service ID" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { client: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (service.serviceType !== "hosting") {
      return NextResponse.json({ error: "Only hosting services can be pushed to Plesk domains" }, { status: 400 });
    }

    if (!service.client?.pleskId) {
      return NextResponse.json({ error: "Client must be synced with Plesk first (Push the client profile first)" }, { status: 400 });
    }

    const result = await createPleskDomain({
      name: service.domainName,
      client_id: service.client.pleskId,
      hosting_type: "virtual"
    });


    return NextResponse.json({ 
      success: true, 
      result
    });

  } catch (error: any) {
    console.error("Plesk Domain Push Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
