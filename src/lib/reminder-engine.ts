import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";
import { sendWhatsAppMessage } from "./whatsapp";
import { updatePleskDomainStatus } from "./plesk";

export const REMINDER_STAGES = [30, 14, 7, 3, 1, 0];

const daysBetween = (date1: Date, date2: Date) => {
  const diffTime = date1.getTime() - date2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getExpiryLabel = (days: number): string => {
  if (days < 0) return `expired ${Math.abs(days)} day(s) ago`;
  if (days === 0) return "expires today";
  return `expires in ${days} day(s)`;
};

export const runReminders = async () => {
  const today = new Date();

  // Load active schedules
  const schedules = await prisma.reminderSchedule.findMany({
    where: { isActive: true },
  });

  const activeStages =
    schedules.length > 0
      ? [...new Set(schedules.flatMap((s) => s.daysBefore))]
      : REMINDER_STAGES;

  const activeChannels =
    schedules.length > 0
      ? [...new Set(schedules.flatMap((s) => s.channels))]
      : ["email"];

  const services = await prisma.service.findMany({
    where: { status: { not: "renewed" } },
    include: { client: true, reminders: true },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const service of services) {
    const daysLeft = daysBetween(service.expiryDate, today);

    // Rule: If service expired than auto change the status for plesk domain
    if (daysLeft <= 0 && service.pleskId && service.status !== "expired") {
       try {
         await updatePleskDomainStatus(service.pleskId, "suspended");
         // Also update our local status
         await prisma.service.update({
           where: { id: service.id },
           data: { status: "expired" }
         });
         console.log(`📡 Auto-suspended Plesk domain ${service.domainName} due to expiration.`);
       } catch (err) {
         console.error(`Failed to auto-suspend ${service.domainName} in Plesk:`, err);
       }
    }

    if (!activeStages.includes(daysLeft)) continue;

    for (const channel of activeChannels) {
      // Skip WhatsApp if client has not opted in
      if (channel === "whatsapp" && !service.client.whatsappOptIn) {
        skipped++;
        continue;
      }

      // Skip WhatsApp if no phone number
      if (channel === "whatsapp" && !service.client.phone) {
        skipped++;
        continue;
      }

      // Check deduplication: already sent this stage via this channel?
      const alreadySent = service.reminders.some(
        (r) => r.stage === daysLeft && r.method === channel,
      );
      if (alreadySent) {
        skipped++;
        continue;
      }

      let success = false;
      let errorMessage: string | undefined;

      try {
        if (channel === "email") {
          success = await sendEmail(
            service.client.email,
            `Reminder: ${service.domainName} ${getExpiryLabel(daysLeft)}`,
            buildEmailHtml(
              service.client.name,
              service.domainName,
              service.serviceType,
              daysLeft,
              service.expiryDate,
            ),
          );
        } else if (channel === "whatsapp" && service.client.phone) {
          const message = buildWhatsAppMessage(
            service.client.name,
            service.domainName,
            service.serviceType,
            daysLeft,
          );
          success = !!(await sendWhatsAppMessage(
            service.client.phone,
            message,
          ));
        }
      } catch (err) {
        success = false;
        errorMessage = String(err);
      }

      // Log to reminder_logs
      await prisma.reminderLog.create({
        data: {
          serviceId: service.id,
          clientId: service.client.id,
          channel,
          daysLeft,
          status: success ? "sent" : "failed",
          errorMessage: errorMessage ?? null,
        },
      });

      // Mark reminder as sent (dedup record)
      if (success) {
        await prisma.reminder.create({
          data: { serviceId: service.id, stage: daysLeft, method: channel },
        });
        sent++;
        console.log(
          `✅ ${channel} sent to ${service.client.email} for ${service.domainName} (${daysLeft}d)`,
        );
      } else {
        failed++;
        console.warn(
          `❌ ${channel} failed for ${service.client.email} - ${service.domainName}`,
        );
      }
    }
  }

  return { sent, failed, skipped };
};

const buildEmailHtml = (
  clientName: string,
  domain: string,
  serviceType: string,
  daysLeft: number,
  expiryDate: Date,
): string => {
  const urgencyColor =
    daysLeft <= 1 ? "#ef4444" : daysLeft <= 7 ? "#f59e0b" : "#6366f1";
  const formattedDate = new Date(expiryDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 22px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #1e293b; font-weight: 600; margin-bottom: 16px; }
    .alert-box { background: ${urgencyColor}12; border: 1px solid ${urgencyColor}30; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
    .alert-days { font-size: 36px; font-weight: 800; color: ${urgencyColor}; line-height: 1; }
    .alert-label { font-size: 13px; color: #64748b; margin-top: 4px; }
    .service-info { background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .service-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .service-row:last-child { border-bottom: none; }
    .service-label { color: #64748b; }
    .service-value { color: #1e293b; font-weight: 600; }
    .cta { text-align: center; margin: 28px 0 8px; }
    .cta-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Service Expiry Reminder</h1>
      <p>Action required for your hosting service</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${clientName},</p>
      <p style="color:#475569;font-size:14px;">This is a reminder that one of your services is approaching its expiry date. Please renew it to avoid service interruption.</p>
      
      <div class="alert-box">
        <div class="alert-days">${daysLeft <= 0 ? "EXPIRED" : daysLeft + " day" + (daysLeft !== 1 ? "s" : "")}</div>
        <div class="alert-label">${daysLeft <= 0 ? "Service has expired" : "until expiry"}</div>
      </div>

      <div class="service-info">
        <div class="service-row">
          <span class="service-label">Service</span>
          <span class="service-value">${domain}</span>
        </div>
        <div class="service-row">
          <span class="service-label">Type</span>
          <span class="service-value">${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}</span>
        </div>
        <div class="service-row">
          <span class="service-label">Expiry Date</span>
          <span class="service-value">${formattedDate}</span>
        </div>
      </div>

      <div class="cta">
        <a href="#" class="cta-btn">Renew Now →</a>
      </div>
    </div>
    <div class="footer">
      This reminder was sent automatically by HostAlert. If you've already renewed, please disregard this email.
    </div>
  </div>
</body>
</html>
  `;
};

const buildWhatsAppMessage = (
  clientName: string,
  domain: string,
  serviceType: string,
  daysLeft: number,
): string => {
  const urgency =
    daysLeft <= 1 ? "🚨 URGENT" : daysLeft <= 7 ? "⚠️ REMINDER" : "📢 Notice";
  const dayText =
    daysLeft <= 0
      ? "has *EXPIRED*"
      : daysLeft === 0
        ? "expires *TODAY*"
        : `expires in *${daysLeft} day${daysLeft !== 1 ? "s" : ""}*`;

  return `${urgency} - Service Expiry
Hi *${clientName}*,
Your *${serviceType}* service for *${domain}* ${dayText}.
Please renew it as soon as possible to avoid any service interruption.
Need help? Reply to this message or contact your hosting provider.
_This is an automated reminder from HostAlert._`;
};
