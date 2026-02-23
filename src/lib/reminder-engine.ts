import { prisma } from "./prisma";
import { sendReminderEmail } from "./email";

// Define reminder stages (days before expiry)
export const REMINDER_STAGES = [14, 7, 1, 0, -1];

/**
 * Returns the number of days between two dates
 */
function daysBetween(date1: Date, date2: Date) {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Main function to run reminders
 */
export async function runReminders() {
  console.log("Reminder job started...");

  const today = new Date();

  // Fetch all services that are unpaid
  const services = await prisma.service.findMany({
    where: { isPaid: false },
    include: { client: true, reminders: true },
  });

  for (const service of services) {
    const daysLeft = daysBetween(service.expiryDate, today);

    // Check if this stage exists in REMINDER_STAGES
    if (!REMINDER_STAGES.includes(daysLeft)) continue;

    // Check if reminder already sent for this stage
    const alreadySent = service.reminders.some((r) => r.stage === daysLeft);
    if (alreadySent) continue;

    // Send reminder (placeholder - replace with email/WhatsApp later)
    // console.log(
    //   `Sending reminder for service ${service.domainName} (client: ${service.client.name}) - ${daysLeft} days left`
    // );
    // Send email
    console.log("Attempting to send email to", service.client.email);
    await sendReminderEmail(
      service.client.email,
      `Reminder: ${service.domainName} expires in ${daysLeft} day(s)`,
      `
        <p>Hi ${service.client.name},</p>
        <p>Your ${service.serviceType} <strong>${service.domainName}</strong> will expire in <strong>${daysLeft} day(s)</strong>.</p>
        <p>Price: $${service.price}</p>
        <p>Please renew on time to avoid service interruption.</p>
        <p>Thanks!</p>
      `,
    );

    // Log the reminder in database
    await prisma.reminder.create({
      data: {
        serviceId: service.id,
        stage: daysLeft,
      },
    });
  }

  console.log("Reminder job finished.");
}
