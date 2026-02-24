
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  try {
    const client = await prisma.client.create({
      data: {
        name: "Test Client",
        email: "test@example.com",
        phone: "1234567890",
        whatsappOptIn: true,
        notes: "Test notes",
      },
    });
    console.log("Success:", client);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
