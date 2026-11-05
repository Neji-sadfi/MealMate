"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { getCurrentUserId } from "@/lib/current-user";
import { isRateLimited } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { loginSchema, profileFormSchema, registerSchema, resetPasswordSchema } from "../schemas";
import type { AuthFormState } from "../types";
import { deleteUserData } from "./account";
import { sendVerificationEmail } from "./emails";
import { registerUser } from "./register";
import { consumeAuthToken, createAuthToken } from "./tokens";

function fieldErrorsOf(issues: { path: PropertyKey[] }[]): AuthFormState["fieldErrors"] {
  return Object.fromEntries(issues.map((issue) => [String(issue.path[0]), true]));
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "invalidInput", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  // Slows down password guessing on one account.
  if (isRateLimited(`login:${parsed.data.email}`, 10, 15 * 60 * 1000)) {
    return { error: "rateLimit" };
  }

  try {
    // Throws a redirect on success, so nothing after this line runs.
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type !== "CredentialsSignin") console.error("login failed", error);
      return { error: error.type === "CredentialsSignin" ? "invalidCredentials" : "unknown" };
    }
    throw error;
  }
  return {};
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "invalidInput", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }

  let result;
  try {
    result = await registerUser(parsed.data);
  } catch (error) {
    console.error("register failed", error); // visible dans le terminal
    return { error: "unknown" };
  }
  if (!result.ok) return { error: result.error, fieldErrors: { email: true } };

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/profile",
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: "unknown" };
    throw error;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.path[0] === "confirmPassword");
    return {
      error: mismatch ? "passwordMismatch" : "invalidInput",
      fieldErrors: fieldErrorsOf(parsed.error.issues),
    };
  }

  try {
    const userId = await consumeAuthToken(parsed.data.token, "password_reset");
    if (!userId) return { error: "invalidResetLink" };
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    // Opening the emailed link also proves the user owns this address.
    await User.updateOne(
      { _id: userId },
      { $set: { passwordHash }, $min: { emailVerifiedAt: new Date() } },
    );
  } catch (error) {
    console.error("reset password failed", error);
    return { error: "unknown" };
  }
  redirect("/login?reset=1");
}

export type ProfileFormState = {
  saved?: boolean;
  error?: "invalidInput" | "unknown";
  fieldErrors?: Record<string, true>;
};

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = profileFormSchema.safeParse({
    ...Object.fromEntries(formData),
    availableDays: formData.getAll("availableDays"),
  });
  if (!parsed.success) {
    return {
      error: "invalidInput",
      fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], true])),
    };
  }

  const {
    name,
    occupation,
    city,
    age,
    heightCm,
    weightKg,
    dailyCaloriesTarget,
    dailyProteinTarget,
    ...preferences
  } = parsed.data;
  const update: Record<string, unknown> = { name, occupation, city };
  for (const [key, value] of Object.entries(preferences)) update[`preferences.${key}`] = value;

  // A field left empty removes the value instead of keeping the old one.
  const clearable = {
    age,
    heightCm,
    weightKg,
    "preferences.dailyCaloriesTarget": dailyCaloriesTarget,
    "preferences.dailyProteinTarget": dailyProteinTarget,
  };
  const cleared: Record<string, 1> = {};
  for (const [key, value] of Object.entries(clearable)) {
    if (value === undefined) cleared[key] = 1;
    else update[key] = value;
  }

  try {
    await User.updateOne(
      { _id: userId },
      { $set: update, ...(Object.keys(cleared).length > 0 ? { $unset: cleared } : {}) },
      { runValidators: true },
    );
  } catch (error) {
    console.error("update profile failed", error);
    return { error: "unknown" };
  }
  revalidatePath("/profile");
  return { saved: true };
}

export type DeleteAccountState = { error?: "invalidPassword" | "unknown" };

export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const password = formData.get("password");
  if (typeof password !== "string" || !password) return { error: "invalidPassword" };
  if (isRateLimited(`delete:${userId.toString()}`, 5, 15 * 60 * 1000))
    return { error: "invalidPassword" };

  try {
    // Asking for the password again protects against a phone left unlocked.
    const user = await User.findById(userId).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return { error: "invalidPassword" };
    }
    await deleteUserData(userId);
  } catch (error) {
    console.error("delete account failed", error);
    return { error: "unknown" };
  }
  await signOut({ redirectTo: "/login?deleted=1" });
  return {};
}

export type ResendVerificationState = {
  status?: "sent" | "alreadyVerified" | "rateLimit" | "error";
};

export async function resendVerificationAction(): Promise<ResendVerificationState> {
  const userId = await getCurrentUserId();
  if (!userId) return { status: "error" };
  if (isRateLimited(`verify:${userId.toString()}`, 3, 60 * 60 * 1000))
    return { status: "rateLimit" };

  try {
    const user = await User.findById(userId).select("name email emailVerifiedAt");
    if (!user) return { status: "error" };
    if (user.emailVerifiedAt) return { status: "alreadyVerified" };
    const token = await createAuthToken(user._id, "email_verification");
    await sendVerificationEmail(user, token);
    return { status: "sent" };
  } catch (error) {
    console.error("resend verification failed", error);
    return { status: "error" };
  }
}
