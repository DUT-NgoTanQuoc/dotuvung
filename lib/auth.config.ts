import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe config (used by middleware). Must not import Prisma or bcrypt —
 * the middleware runs on the Edge runtime where those aren't available.
 */
export const authConfig = {
  pages: { signIn: "/admin/login" },
  providers: [], // populated in lib/auth.ts (Node runtime only)
  callbacks: {
    authorized: ({ auth, request }) => {
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
      const isLoginPage = request.nextUrl.pathname === "/admin/login";
      if (!isAdminRoute || isLoginPage) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
