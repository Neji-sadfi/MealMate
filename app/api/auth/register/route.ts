import { NextResponse } from "next/server";
import { registerSchema } from "@/features/auth/schemas";
import { registerUser } from "@/features/auth/services/register";

// POST /api/auth/register: create a USER account. The UI uses the registerAction
// server action instead; this endpoint exists for the API contract and tests.
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = await registerUser(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }
  return NextResponse.json({ id: result.userId }, { status: 201 });
}
