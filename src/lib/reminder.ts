import { prisma } from "./prisma";
import { sendEmail } from "./email";
import { sendWhatsAppMessage } from "./whatsapp";

interface Service {
  id: number;
  domainName: string;
  expiryDate: Date | string;
  client: {
    email: string;
    phone: string;
  };
}

export async function sendReminder(service: Service) {
  try {
    console.log("Sending reminder for:", service.domainName);

    // 1️⃣ Email
    const emailSuccess = await sendEmail(
      service.client.email,
      "Hosting Expiry Reminder",
      `<p>Your domain <b>${service.domainName}</b> will expire on ${new Date(service.expiryDate).toDateString()}</p>`
    );

    if (!emailSuccess) throw new Error("Email failed");

    // 2️⃣ WhatsApp
    const waSuccess = await sendWhatsAppMessage(service.client.phone,
      `<p>Your domain <b>${service.domainName}</b> will expire on ${new Date(service.expiryDate).toDateString()}</p>`
    );

    if (!waSuccess) throw new Error("WhatsApp failed");

    // 3️⃣ Log reminder
    await prisma.reminder.create({
      data: { serviceId: service.id, sentAt: new Date(), method: "EMAIL+WHATSAPP", stage: 1 },
    });

    console.log("Reminder sent successfully");
  } catch (err) {
    console.error("Reminder error:", err);
  }
}