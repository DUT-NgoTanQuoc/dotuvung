import type { AdminRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// NextAuth v5 beta re-exports its core Session/User/JWT interfaces from
// @auth/core — the `NextAuthConfig["callbacks"]` types resolve against
// *those* modules, not "next-auth"/"next-auth/jwt" directly. Augmenting
// only "next-auth" leaves session/jwt callback params typed as {}.
declare module "@auth/core/types" {
  interface User {
    role?: AdminRole;
  }

  interface Session {
    user: {
      id: string;
      role: AdminRole;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: AdminRole;
  }
}

declare module "next-auth" {
  interface User {
    role?: AdminRole;
  }

  interface Session {
    user: {
      id: string;
      role: AdminRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AdminRole;
  }
}
