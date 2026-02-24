
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const cols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ReminderLog'
    `;
    console.log("Columns in ReminderLog table:", cols);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
