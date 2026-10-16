// Auth.js endpoints: sign in (POST /api/auth/callback/credentials), sign out
// (POST /api/auth/signout), session, csrf... These cover the spec's login/logout.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
