import { z } from "zod";
import { DIETS } from "@/models/enums";

function requiredNumber(min: number, max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? Number(value) : value),
    z.number().finite().min(min).max(max),
  );
}

// Shared by the forms, the server actions, the Credentials provider and the API.

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  heightCm: requiredNumber(50, 260),
  weightKg: requiredNumber(20, 400),
  diet: z.enum(DIETS),
  allergies: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine(
      (value) =>
        /^(none|no allergies)$/i.test(value) ||
        value
          .split(/[,;]/)
          .every((allergy) => allergy.trim().length > 0 && allergy.trim().length <= 80),
    )
    .transform((value) =>
      /^(none|no allergies)$/i.test(value)
        ? []
        : value
            .split(/[,;]/)
            .map((allergy) => allergy.trim())
            .slice(0, 20),
    ),
  weeklyBudget: requiredNumber(0, 100000),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1).max(100),
    password: z.string().min(8).max(128),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"] });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
