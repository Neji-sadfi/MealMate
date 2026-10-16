"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";
import { loginSchema, registerSchema } from "../schemas";
import type { AuthFormState } from "../types";
import { registerUser } from "./register";

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

  try {
    // Throws a redirect on success, so nothing after this line runs.
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
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

  const result = await registerUser(parsed.data);
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
