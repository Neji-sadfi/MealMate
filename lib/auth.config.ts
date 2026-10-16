import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/models/enums";

// Lightweight Auth.js config shared by proxy.ts and lib/auth.ts.
// It must NOT import Mongoose, bcrypt or any model: proxy.ts only reads the JWT.

const publicRoutes = ["/login", "/register", "/forgot-password", "/~offline"];
const authRoutes = ["/login", "/register", "/forgot-password"];
const adminPrefix = "/admin";

export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [], // Added in lib/auth.ts (Node.js runtime only).
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isSignedIn = Boolean(auth?.user);

      if (authRoutes.includes(pathname)) {
        // Already signed in: skip the login/register screens.
        return isSignedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      }
      if (publicRoutes.includes(pathname)) return true;
      if (!isSignedIn) return false; // Redirects to pages.signIn (/login).

      if (pathname.startsWith(adminPrefix) && auth?.user.role !== "ADMIN") {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
} satisfies NextAuthConfig;
