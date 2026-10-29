import { z } from "zod";
import { DIETS, UNITS } from "@/models/enums";

const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("user"),
    content: z.string().trim().min(1).max(1200),
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().trim().min(1).max(4000),
  }),
]);

export const recipeAiRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("generate"),
    ingredients: z.string().trim().max(300).default(""),
    goal: z.string().trim().max(250).default(""),
    servings: z.number().int().min(1).max(12),
    maxTime: z.number().int().min(5).max(240),
    consent: z.literal(true),
  }),
  z.object({
    mode: z.literal("chat"),
    message: z.string().trim().min(1).max(1200),
    history: z.array(chatMessageSchema).max(8).default([]),
    consent: z.literal(true),
  }),
]);

export const generatedRecipeSchema = z.object({
  title: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160),
  description: z.string().trim().max(2000),
  diets: z.array(z.enum(DIETS)),
  tags: z.array(z.string().trim().min(1).max(40)).max(8),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prepTimeMinutes: z.number().int().min(1).max(600),
  servings: z.number().int().min(1).max(50),
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
        quantity: z.number().min(0),
        unit: z.enum(UNITS),
        note: z.string().trim().max(200).optional(),
      }),
    )
    .min(1)
    .max(30),
  steps: z
    .array(
      z.object({
        order: z.number().int().min(1),
        title: z.string().trim().min(1).max(120),
        description: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(20),
});

export type GeneratedRecipe = z.infer<typeof generatedRecipeSchema>;
export type RecipeAiRequest = z.infer<typeof recipeAiRequestSchema>;
