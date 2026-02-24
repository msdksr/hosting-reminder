import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Client 1 ─────────────────────────────────────────────────────────────
  const client1 = await prisma.client.upsert({
    where: { email: "msd.ksr@gmail.com" } as never,
    update: {},
    create: {
      name: "Masud Kaisar",
      email: "msd.ksr@gmail.com",
      phone: "01929509168",
      whatsappOptIn: true,
      notes: "Primary account – domain + hosting bundle",
    },
  });

  const service1 = await prisma.service.create({
    data: {
      clientId: client1.id,
      domainName: "masudkaisar.com",
      serviceType: "domain",
      expiryDate: new Date("2026-03-25"),
      price: 1200,
      isPaid: false,
      status: "active",
    },
  });

  const service2 = await prisma.service.create({
    data: {
      clientId: client1.id,
      domainName: "masudkaisar.com",
      serviceType: "hosting",
      expiryDate: new Date("2026-04-10"),
      price: 4500,
      isPaid: true,
      status: "active",
    },
  });

  // Reminders for client 1
  await prisma.reminder.createMany({
    data: [
      { serviceId: service1.id, stage: 30, method: "email" },
      { serviceId: service1.id, stage: 14, method: "whatsapp" },
      { serviceId: service1.id, stage: 7,  method: "both" },
      { serviceId: service2.id, stage: 30, method: "email" },
      { serviceId: service2.id, stage: 7,  method: "both" },
    ],
  });

  // Reminder logs for client 1
  await prisma.reminderLog.createMany({
    data: [
      {
        serviceId: service1.id,
        clientId: client1.id,
        channel: "email",
        daysLeft: 30,
        status: "sent",
        sentAt: new Date("2026-02-23T09:00:00Z"),
      },
      {
        serviceId: service1.id,
        clientId: client1.id,
        channel: "whatsapp",
        daysLeft: 14,
        status: "sent",
        sentAt: new Date("2026-03-09T09:00:00Z"),
      },
      {
        serviceId: service2.id,
        clientId: client1.id,
        channel: "email",
        daysLeft: 30,
        status: "sent",
        sentAt: new Date("2026-03-11T09:00:00Z"),
      },
    ],
  });

  console.log(`✅ Client 1 seeded: ${client1.name} (${client1.email})`);

  // ─── Client 2 ─────────────────────────────────────────────────────────────
  const client2 = await prisma.client.upsert({
    where: { email: "masud.storage1@gmail.com" } as never,
    update: {},
    create: {
      name: "Masud Storage",
      email: "masud.storage1@gmail.com",
      phone: "01670966357",
      whatsappOptIn: true,
      notes: "Secondary account – SSL + hosting",
    },
  });

  const service3 = await prisma.service.create({
    data: {
      clientId: client2.id,
      domainName: "masud-storage.net",
      serviceType: "ssl",
      expiryDate: new Date("2026-05-01"),
      price: 2500,
      isPaid: false,
      status: "active",
    },
  });

  const service4 = await prisma.service.create({
    data: {
      clientId: client2.id,
      domainName: "masud-storage.net",
      serviceType: "hosting",
      expiryDate: new Date("2026-06-15"),
      price: 3800,
      isPaid: true,
      status: "active",
    },
  });

  // Reminders for client 2
  await prisma.reminder.createMany({
    data: [
      { serviceId: service3.id, stage: 30, method: "email" },
      { serviceId: service3.id, stage: 7,  method: "whatsapp" },
      { serviceId: service4.id, stage: 14, method: "both" },
      { serviceId: service4.id, stage: 3,  method: "whatsapp" },
    ],
  });

  // Reminder logs for client 2
  await prisma.reminderLog.createMany({
    data: [
      {
        serviceId: service3.id,
        clientId: client2.id,
        channel: "email",
        daysLeft: 30,
        status: "sent",
        sentAt: new Date("2026-04-01T10:00:00Z"),
      },
      {
        serviceId: service3.id,
        clientId: client2.id,
        channel: "whatsapp",
        daysLeft: 7,
        status: "failed",
        errorMessage: "WhatsApp delivery timeout",
        sentAt: new Date("2026-04-24T10:00:00Z"),
      },
      {
        serviceId: service4.id,
        clientId: client2.id,
        channel: "email",
        daysLeft: 14,
        status: "sent",
        sentAt: new Date("2026-06-01T10:00:00Z"),
      },
    ],
  });

  console.log(`✅ Client 2 seeded: ${client2.name} (${client2.email})`);

  // ─── Reminder Schedule ────────────────────────────────────────────────────
  await prisma.reminderSchedule.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Default",
      daysBefore: [30, 14, 7, 3, 1],
      channels: ["email", "whatsapp"],
      serviceTypes: ["domain", "hosting", "ssl"],
      isActive: true,
    },
  });

  console.log("✅ Default reminder schedule seeded");

  // ─── Admin Users ─────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("admin123", 12);
  
  await prisma.user.upsert({
    where: { email: "admin@hostalert.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@hostalert.com",
      password: hashedPassword,
      role: "SUPERADMIN",
      isApproved: true,
    },
  });

  console.log("✅ SuperAdmin user seeded (admin@hostalert.com / admin123)");

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
