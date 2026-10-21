import { z } from "zod";
import { DIETS, UNITS } from "@/models/enums";

export const recipeInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z
    .union([
      z
        .string()
        .url()
        .max(2048)
        .refine((value) => /^https?:\/\//i.test(value), {
          message: "Photo URL must use HTTP or HTTPS",
        }),
      z.literal(""),
    ])
    .optional(),
  diets: z.array(z.enum(DIETS)).default([]),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(["easy", "medium", "hard"]).default("easy"),
  prepTimeMinutes: z.number().int().min(1).max(600),
  servings: z.number().int().min(1).max(50).default(1),
  costPerServing: z.number().min(0),
  nutrition: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
  }),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        quantity: z.number().min(0).optional(),
        unit: z.enum(UNITS),
        note: z.string().max(200).optional(),
      }),
    )
    .default([]),
  steps: z
    .array(
      z.object({
        order: z.number().int().min(1),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(1000),
      }),
    )
    .default([]),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
