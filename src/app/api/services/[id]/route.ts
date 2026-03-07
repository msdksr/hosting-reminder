import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { updatePleskDomainStatus } from "@/lib/plesk";


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const serviceId = Number(id);

  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { client: true },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json(service);
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
    const serviceId = Number(id);
    const body = await req.json();
    const { domainName, serviceType, expiryDate, price, isPaid, status, pleskId } = body;

    // Get current state to detect changes
    const currentService = await prisma.service.findUnique({
      where: { id: serviceId }
    });

    if (!currentService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const updateData: any = {
      domainName,
      serviceType,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      price: price !== undefined ? Number(price) : undefined,
      isPaid,
      status,
    };

    if (pleskId !== undefined) {
      // Ensure we don't convert null/undefined to 0
      updateData.pleskId = pleskId ? Number(pleskId) : null;
    }

    // Rule: if payment status changed to paid than auto update service expire date for 1 year 
    // also update the plesk domain status with active.
    const paymentJustCompleted = isPaid === true && currentService.isPaid === false;
    
    if (paymentJustCompleted) {
      const newExpiry = new Date(currentService.expiryDate);
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      updateData.expiryDate = newExpiry;
      updateData.status = "active";
    }

    const updatedService = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: { client: true },
    });

    // If payment completed and synced with Plesk, reactivate domain
    if (paymentJustCompleted && updatedService.pleskId) {
      try {
        await updatePleskDomainStatus(updatedService.pleskId, "active");
      } catch (err) {
        console.error("Plesk auto-activation failed:", err);
      }
    }

    return NextResponse.json(updatedService);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    await prisma.service.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
