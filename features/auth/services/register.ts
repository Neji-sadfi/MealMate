import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import type { RegisterInput } from "../schemas";

export type RegisterResult = { ok: true; userId: string } | { ok: false; error: "emailTaken" };

/** Creates a USER account. Input must already be validated with registerSchema. */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  await connectToDatabase();

  if (await User.exists({ email: input.email })) {
    return { ok: false, error: "emailTaken" };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await User.create({ name: input.name, email: input.email, passwordHash });
  return { ok: true, userId: user._id.toString() };
}
