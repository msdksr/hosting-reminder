
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Client'
    `;
    console.log("Columns in Client table:", result);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();
