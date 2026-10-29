import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/features/auth/services/emails";
import { createAuthToken } from "@/features/auth/services/tokens";
import { User } from "@/models/User";

const HOUR_MS = 60 * 60 * 1000;

// POST /api/auth/forgot-password: emails a one-time reset link.
// Always answers the same way, so it cannot be used to find out which emails have an account.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ email: z.email().trim().toLowerCase() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalidEmail" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (
    isRateLimited(`reset:ip:${ip}`, 10, HOUR_MS) ||
    isRateLimited(`reset:${parsed.data.email}`, 3, HOUR_MS)
  ) {
    return NextResponse.json({ error: "rateLimit" }, { status: 429 });
  }

  try {
    await connectToDatabase();
    const user = await User.findOne({ email: parsed.data.email }).select("name email");
    if (user) {
      const token = await createAuthToken(user._id, "password_reset");
      await sendPasswordResetEmail(user, token);
    }
  } catch (error) {
    console.error("forgot-password failed", error);
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
