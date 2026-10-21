import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { User } from "@/models/User";

const profileUpdate = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  age: z.number().int().min(10).max(120).optional(),
  heightCm: z.number().min(50).max(260).optional(),
  weightKg: z.number().min(20).max(400).optional(),
  occupation: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await User.findById(userId).select("-passwordHash").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = profileUpdate.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile", issues: parsed.error.issues }, { status: 400 });
  const user = await User.findByIdAndUpdate(userId, { $set: parsed.data }, { returnDocument: "after", runValidators: true }).select("-passwordHash");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user);
}
