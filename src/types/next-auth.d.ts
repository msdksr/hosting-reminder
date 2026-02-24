import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    role: Role;
    isApproved: boolean;
    clientId?: number | null;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      isApproved: boolean;
      clientId?: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isApproved: boolean;
    clientId?: number | null;
  }
}

declare module "@auth/core/types" {
  interface User {
    role: Role;
    isApproved: boolean;
    clientId?: number | null;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: Role;
    isApproved: boolean;
    clientId?: number | null;
  }
}
