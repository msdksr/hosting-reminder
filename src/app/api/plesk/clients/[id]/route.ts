import { NextResponse } from "next/server";
import { createPleskClient } from "@/lib/plesk";
import { prisma } from "@/lib/prisma";

// Next.js 15+ requires awaiting params in dynamic routes
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const clientId = parseInt(params.id);
    if (isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Plesk requires a login. We'll derive it from name or email.
    const login = client.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    
    // Generate a secure-ish temporary password if none exists
    const tempPassword = "ChangeMe1Q**" + Math.floor(1000 + Math.random() * 9000);

    const result = await createPleskClient({
      name: client.name,
      email: client.email,
      login: login + Math.floor(Math.random() * 100), // Append random to avoid collisions
      password: tempPassword,
      type: "customer",
      phone: client.phone || undefined,
    });

    return NextResponse.json({ 
      success: true, 
      result,
      tempPassword // Return password so admin can give it to client
    });
  } catch (error: any) {
    console.error("Plesk Push Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

