import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = process.env.WHATSAPP_API_VERSION || "v25.0";

    if (!token || !phoneNumberId) {
      return NextResponse.json({ error: "Missing env variables" }, { status: 500 });
    }

    const response = await fetch(
      `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "8801929509168",
          type: "template",
          template: {
            name: "hello_world",
            language: { code: "en_US" }
          }
        })
      }
    );

    const data = await response.json();

    console.log("Meta response:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}