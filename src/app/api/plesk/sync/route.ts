import { NextResponse } from "next/server";
import { fetchPleskClients, fetchPleskDomains } from "@/lib/plesk";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";


export async function POST() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const syncLog = await prisma.syncLog.create({
    data: {
      source: "plesk",
      status: "running",
    },
  });

  try {
    const pleskClients = await fetchPleskClients();
    const pleskDomains = await fetchPleskDomains();


    let totalSynced = 0;
    let totalErrors = 0;
    const errors: string[] = [];

    // Map Plesk clients to local clients
    const clientMap = new Map<number, any>(); // plesk_id -> local_client_id

    for (const pc of pleskClients) {
      try {
        const client = await prisma.client.upsert({
          where: { email: pc.email },
          update: {
            name: pc.name || pc.login,
            phone: pc.phone || null,
          },
          create: {
            name: pc.name || pc.login,
            email: pc.email,
            phone: pc.phone || null,
          },
        });
        clientMap.set(pc.id, client.id);
        totalSynced++;
      } catch (err: any) {
        totalErrors++;
        errors.push(`Client ${pc.login}: ${err.message}`);
      }
    }

    // Map Plesk domains to local services
    for (const pd of pleskDomains) {
      try {
        const localClientId = clientMap.get(pd.client_id);
        if (!localClientId) {
          // Find client by plesk client id? 
          // Our Client model doesn't store plesk_id. Maybe it should?
          // For now, let's skip if no client found in this session
          continue;
        }

        // Check if service already exists for this domain
        await prisma.service.upsert({
          where: { 
            // We don't have a unique constraint on domainName alone in schema.prisma, 
            // but we can find it.
            id: (await prisma.service.findFirst({ where: { domainName: pd.name, clientId: localClientId } }))?.id || 0
          },
          update: {
            status: "active",
          },
          create: {
            clientId: localClientId,
            domainName: pd.name,
            serviceType: "hosting", // Default to hosting
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year if not known
            status: "active",
          },
        });
        totalSynced++;
      } catch (err: any) {
        totalErrors++;
        errors.push(`Domain ${pd.name}: ${err.message}`);
      }
    }

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: totalErrors === 0 ? "success" : "partial",
        totalSynced,
        totalErrors,
        errorDetails: errors.join("\n"),
        finishedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      totalSynced,
      totalErrors,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "failed",
        errorDetails: error.message,
        finishedAt: new Date(),
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
