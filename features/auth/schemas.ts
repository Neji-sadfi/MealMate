import { z } from "zod";
import {
  ACTIVITY_LEVELS,
  DIETS,
  EQUIPMENT,
  NUTRITION_GOALS,
  SPORT_GOALS,
  SPORT_LEVELS,
  WEEKDAYS,
} from "@/models/enums";

function requiredNumber(min: number, max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? Number(value) : value),
    z.number().finite().min(min).max(max),
  );
}

function optionalNumber(min: number, max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? Number(value) : undefined),
    z.number().finite().min(min).max(max).optional(),
  );
}

/** "peanuts, milk" becomes a list; an empty field or "none" becomes an empty list. */
const commaList = z
  .string()
  .trim()
  .max(500)
  .transform((value) =>
    /^(none|no allergies|aucune?)$/i.test(value)
      ? []
      : value
          .split(/[,;]/)
          .map((item) => item.trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 20),
  );

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

export const profileFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  age: optionalNumber(10, 120),
  heightCm: optionalNumber(50, 260),
  weightKg: optionalNumber(20, 400),
  occupation: z.string().trim().max(120),
  city: z.string().trim().max(120),
  diet: z.enum(DIETS),
  allergies: commaList,
  intolerances: commaList,
  goal: z.enum(NUTRITION_GOALS),
  activityLevel: z.enum(ACTIVITY_LEVELS),
  weeklyBudget: requiredNumber(0, 100000),
  dailyCaloriesTarget: optionalNumber(800, 6000),
  dailyProteinTarget: optionalNumber(10, 400),
  sportGoal: z.enum(SPORT_GOALS),
  level: z.enum(SPORT_LEVELS),
  equipment: z.enum(EQUIPMENT),
  sessionDurationMinutes: requiredNumber(10, 180),
  availableDays: z.array(z.enum(WEEKDAYS)),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
