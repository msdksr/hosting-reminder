
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkActualColumns() {
  try {
    const result = await prisma.$queryRaw`SELECT * FROM "Client" LIMIT 0`;
    console.log("Result keys:", Object.keys((result as any[])[0] || {}));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualColumns();
