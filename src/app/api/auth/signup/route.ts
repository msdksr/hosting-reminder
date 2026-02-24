
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let clientId = null;
    let isApproved = false;

    if (role === Role.CLIENT) {
      isApproved = true; // Clients are auto-approved
      // Check if this email belongs to an existing managed client
      const existingClient = await prisma.client.findUnique({ where: { email } });
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create a new client record for this user
        const newClient = await prisma.client.create({
          data: {
            name: name || email.split("@")[0],
            email,
          },
        });
        clientId = newClient.id;
      }
    } else if (role === Role.ADMIN) {
      isApproved = false; // Admins need approval
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as Role,
        isApproved,
        clientId,
      },
    });

    return NextResponse.json({ success: true, user: { email: user.email, role: user.role } });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
