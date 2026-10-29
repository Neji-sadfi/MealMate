// Types for the auth + profile module (Member 1).

/** Translation keys under auth.errors in messages/en.json. */
export type AuthErrorKey =
  | "invalidInput"
  | "invalidCredentials"
  | "emailTaken"
  | "passwordMismatch"
  | "invalidResetLink"
  | "unknown";

export type AuthFormState = {
  error?: AuthErrorKey;
  fieldErrors?: Partial<
    Record<
      | "name"
      | "email"
      | "password"
      | "confirmPassword"
      | "heightCm"
      | "weightKg"
      | "diet"
      | "allergies"
      | "weeklyBudget",
      true
    >
  >;
};
