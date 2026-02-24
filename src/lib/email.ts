import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const resp = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
    });
    console.log("Email sent:", resp);
    return true;  // ✅ return true on success
  } catch (err) {
    console.error("Email failed:", err);
    return false; // ✅ return false on failure
  }
}