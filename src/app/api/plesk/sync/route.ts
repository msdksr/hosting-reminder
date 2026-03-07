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
    const clientMap = new Map<number, number>(); // plesk_id -> local_client_id

    // First, populate clientMap with existing clients that have pleskId
    const existingClients = await prisma.client.findMany({
      where: { pleskId: { not: null } },
      select: { id: true, pleskId: true }
    });
    existingClients.forEach(c => clientMap.set(c.pleskId!, c.id));

    for (const pc of pleskClients) {
      try {
        const client = await prisma.client.upsert({
          where: { pleskId: pc.id }, // Use pleskId as primary unique identifier
          update: {
            name: pc.name || pc.login,
            email: pc.email,
            phone: pc.phone || null,
            pleskLogin: pc.login,
          },
          create: {
            name: pc.name || pc.login,
            email: pc.email,
            phone: pc.phone || null,
            pleskId: pc.id,
            pleskLogin: pc.login,
          },
        });
        clientMap.set(pc.id, client.id);
        totalSynced++;
      } catch (err: any) {
        // Fallback for email conflicts if pleskId upsert failed for some reason
        try {
           const client = await prisma.client.update({
             where: { email: pc.email },
             data: { pleskId: pc.id, pleskLogin: pc.login }
           });
           clientMap.set(pc.id, client.id);
           totalSynced++;
        } catch (e2) {
          totalErrors++;
          errors.push(`Client ${pc.login}: ${err.message}`);
        }
      }
    }

    // Map Plesk domains to local services
    for (const pd of pleskDomains) {
      try {
        const localClientId = clientMap.get(pd.client_id);
        if (!localClientId) {
          console.warn(`Skipping domain ${pd.name}: Owner client (Plesk ID ${pd.client_id}) not found or synced.`);
          continue;
        }

        // Efficiently link Plesk domains to local services
        // 1. Try to find by unique pleskId
        let existingService = await prisma.service.findUnique({ 
          where: { pleskId: pd.id } 
        });
        
        // 2. Fallback: Try to find by domain name + client (manual entries)
        if (!existingService) {
          existingService = await prisma.service.findFirst({
            where: { domainName: pd.name, clientId: localClientId }
          });
        }

        // 3. Upsert using the ID we found, or create new
        // We ensure pleskId is explicitly set to pd.id (e.g. 5)
        await prisma.service.upsert({
          where: { id: existingService?.id || 0 },
          update: {
            domainName: pd.name,
            status: "active",
            pleskId: pd.id,
            clientId: localClientId,
          },
          create: {
            pleskId: pd.id,
            clientId: localClientId,
            domainName: pd.name,
            serviceType: "hosting",
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: "active",
          },
        });
        
        console.log(`Sync success: Domain ${pd.name} linked to local client ${localClientId} with Plesk ID ${pd.id}`);
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
