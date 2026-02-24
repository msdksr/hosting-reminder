
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const pending = await prisma.user.findMany({
      where: { 
        role: "ADMIN",
        isApproved: false,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pending);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 });
  }
}
