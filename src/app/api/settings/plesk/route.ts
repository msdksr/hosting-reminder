import { NextResponse } from "next/server";
import { getPleskConfig, savePleskConfig } from "@/lib/plesk";

export async function GET() {
  try {
    const config = await getPleskConfig();
    if (config && config.apiKey) {
      // Mask the API key in the response for security
      config.apiKey = "********" + config.apiKey.substring(config.apiKey.length - 4);
    }
    return NextResponse.json(config || {});
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = await savePleskConfig({
      host: body.host,
      port: parseInt(body.port) || 8443,
      username: body.username,
      apiKey: body.apiKey,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


