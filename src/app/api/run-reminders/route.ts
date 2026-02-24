import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminder-engine";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  const authHeader = req.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  if (!session && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If it's a session, must be admin
  if (session && (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await runReminders();
    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Failed to run reminders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}