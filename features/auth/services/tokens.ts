import { createHash, randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { AuthToken, type AuthTokenType } from "@/models/AuthToken";

const TTL_MS: Record<AuthTokenType, number> = {
  password_reset: 60 * 60 * 1000, // 1 hour
  email_verification: 24 * 60 * 60 * 1000, // 24 hours
};

function hashOf(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a new one-time token (replacing older ones of the same type) and returns it in clear. */
export async function createAuthToken(
  userId: Types.ObjectId,
  type: AuthTokenType,
): Promise<string> {
  await connectToDatabase();
  const token = randomBytes(32).toString("base64url");
  await AuthToken.deleteMany({ userId, type });
  await AuthToken.create({
    userId,
    type,
    tokenHash: hashOf(token),
    expiresAt: new Date(Date.now() + TTL_MS[type]),
  });
  return token;
}

/** Deletes the token and returns its user id, or null if it is unknown or expired. */
export async function consumeAuthToken(
  token: string,
  type: AuthTokenType,
): Promise<Types.ObjectId | null> {
  if (!token || token.length > 100) return null;
  await connectToDatabase();
  const found = await AuthToken.findOneAndDelete({
    tokenHash: hashOf(token),
    type,
    expiresAt: { $gt: new Date() },
  });
  return found?.userId ?? null;
}

/** Checks a token without consuming it (used to show the reset form only for valid links). */
export async function isAuthTokenValid(token: string, type: AuthTokenType): Promise<boolean> {
  if (!token || token.length > 100) return false;
  await connectToDatabase();
  return Boolean(
    await AuthToken.exists({ tokenHash: hashOf(token), type, expiresAt: { $gt: new Date() } }),
  );
}
