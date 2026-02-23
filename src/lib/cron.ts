import cron from "node-cron";
import { runReminders } from "./reminder-engine";

// Every day at 1 AM
cron.schedule("0 1 * * *", async () => {
  await runReminders();
});