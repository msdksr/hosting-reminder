import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReminderEmail(to: string, subject: string, body: string) {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "noreply@example.com",
      to,
      subject,
      html: body,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
  }
}