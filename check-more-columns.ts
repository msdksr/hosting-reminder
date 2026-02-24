
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const serviceCols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Service'
    `;
    console.log("Columns in Service table:", serviceCols);
    
    const reminderCols = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Reminder'
    `;
    console.log("Columns in Reminder table:", reminderCols);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
