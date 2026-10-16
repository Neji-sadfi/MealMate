import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16 renamed middleware.ts to proxy.ts (same behaviour).
// Only reads the session JWT: never import Mongoose or lib/auth.ts here.
// Access rules live in authConfig.callbacks.authorized.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Skip API routes, Next.js internals, the service worker and static files.
  matcher: ["/((?!api|_next/static|_next/image|serwist|.*\\..*).*)"],
};
