import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import type { RegisterInput } from "../schemas";
import { sendVerificationEmail } from "./emails";
import { createAuthToken } from "./tokens";

export type RegisterResult = { ok: true; userId: string } | { ok: false; error: "emailTaken" };

/** Creates a USER account. Input must already be validated with registerSchema. */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  await connectToDatabase();

  if (await User.exists({ email: input.email })) {
    return { ok: false, error: "emailTaken" };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  let user;
  try {
    user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      preferences: {
        diet: input.diet,
        allergies: input.allergies,
        weeklyBudget: input.weeklyBudget,
      },
    });
  } catch (error) {
    // Two sign-ups at the same time: the unique index lets only one through.
    if ((error as { code?: number }).code === 11000) return { ok: false, error: "emailTaken" };
    throw error;
  }

  // The account works right away; a failed email must not block the sign-up.
  try {
    const token = await createAuthToken(user._id, "email_verification");
    await sendVerificationEmail(user, token);
  } catch (error) {
    console.error("verification email failed", error);
  }
  return { ok: true, userId: user._id.toString() };
}
