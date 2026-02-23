import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminder-engine";

export async function GET() {
  try {
    await runReminders();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Failed to run reminders" }, { status: 500 });
  }
}