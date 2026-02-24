
import { prisma } from "./src/lib/prisma";

async function test() {
  try {
    const client = await prisma.client.create({
      data: {
        name: "API Test Client",
        email: "api@test.com",
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
