import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const services = await prisma.service.findMany({
    include: { client: true }, // ← THIS IS CRUCIAL
  });
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, domainName, serviceType, expiryDate, price } = body;
  console.log(expiryDate, "expire date");
  

  if (!clientId || !domainName || !serviceType || !expiryDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      clientId,
      domainName,
      serviceType,
      expiryDate: new Date(expiryDate), // ← just a Date object
      price: price || 0,
    },
    include: { client: true },
  });

  return NextResponse.json(service);
}