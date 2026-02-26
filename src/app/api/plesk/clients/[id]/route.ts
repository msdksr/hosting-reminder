import { NextResponse } from "next/server";
import { createPleskClient } from "@/lib/plesk";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id);
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Plesk requires a login. We'll derive it from name or email.
    const login = client.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const result = await createPleskClient({
      name: client.name,
      email: client.email,
      login: login + Math.floor(Math.random() * 100), // Append random to avoid collisions
      phone: client.phone || undefined,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
