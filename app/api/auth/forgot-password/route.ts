import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ email: z.email().trim().toLowerCase() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  return NextResponse.json(
    { error: "Password reset email is not configured for this app yet." },
    { status: 503 },
  );
}
