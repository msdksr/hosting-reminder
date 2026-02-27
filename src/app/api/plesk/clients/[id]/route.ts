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
      login: login,
      password: tempPassword,
      type: "customer",
      phone: client.phone || undefined,
    });

    // Store credentials in our database
    await prisma.client.update({
      where: { id: clientId },
      data: {
        pleskId: result.id,
        pleskLogin: login,
        pleskPassword: tempPassword,
      }
    });

    return NextResponse.json({ 
      success: true, 
      result,
      tempPassword,
      login: login,
      pleskId: result.id
    });

  } catch (error: any) {
    console.error("Plesk Push Error:", error);

    // Provide helpful message for license limits
    if (error.message.includes("available resources") || error.message.includes("clients) left")) {
      return NextResponse.json({ 
        error: "Plesk License Limit: You have reached the maximum number of clients allowed by your Plesk license. Please upgrade your license or remove unused clients in Plesk." 
      }, { status: 403 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

}

