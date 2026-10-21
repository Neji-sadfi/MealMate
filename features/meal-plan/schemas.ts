import { z } from "zod";
import { MEAL_TYPES } from "./types";

// All inputs crossing the meal-plan API. Shared by the route handlers, the
// client wrapper and the generator route.

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date.");

export const mealTypeSchema = z.enum(MEAL_TYPES);

export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Expected a HH:mm time.");

export const weekStartQuerySchema = z.object({ weekStart: isoDateSchema.optional() });

export const createWeekSchema = z.object({ weekStart: isoDateSchema });

export const addMealActionSchema = z.object({
  action: z.literal("addMeal"),
  date: isoDateSchema,
  type: mealTypeSchema,
  recipeId: z.string().min(1),
  time: timeSchema.optional(),
  servings: z.number().int().min(1).max(20).default(1),
});

export const updateMealActionSchema = z.object({
  action: z.literal("updateMeal"),
  mealId: z.string().min(1),
  recipeId: z.string().min(1).optional(),
  type: mealTypeSchema.optional(),
  time: timeSchema.nullable().optional(),
  servings: z.number().int().min(1).max(20).optional(),
});

export const moveMealActionSchema = z.object({
  action: z.literal("moveMeal"),
  mealId: z.string().min(1),
  date: isoDateSchema,
  type: mealTypeSchema.optional(),
});

export const removeMealActionSchema = z.object({
  action: z.literal("removeMeal"),
  mealId: z.string().min(1),
});

export const duplicateDayActionSchema = z.object({
  action: z.literal("duplicateDay"),
  /** Day to copy. */
  date: isoDateSchema,
  /** Day to copy to: it must belong to the same week. */
  targetDate: isoDateSchema,
});

export const duplicateWeekActionSchema = z.object({
  action: z.literal("duplicateWeek"),
});

export const updateCriteriaActionSchema = z.object({
  action: z.literal("updateCriteria"),
  people: z.number().int().min(1).max(12).optional(),
  days: z.number().int().min(1).max(7).optional(),
  mealsPerDay: z.number().int().min(1).max(4).optional(),
  extraBudget: z.number().min(0).max(10_000).optional(),
});

export const mealPlanActionSchema = z.discriminatedUnion("action", [
  addMealActionSchema,
  updateMealActionSchema,
  moveMealActionSchema,
  removeMealActionSchema,
  duplicateDayActionSchema,
  duplicateWeekActionSchema,
  updateCriteriaActionSchema,
]);

export type MealPlanAction = z.infer<typeof mealPlanActionSchema>;

export const generatePlanSchema = z.object({
  weekStart: isoDateSchema,
  days: z.number().int().min(1).max(7).optional(),
  mealsPerDay: z.number().int().min(1).max(4).optional(),
  extraBudget: z.number().min(0).max(10_000).optional(),
  people: z.number().int().min(1).max(12).optional(),
});

export type GeneratePlanInput = z.infer<typeof generatePlanSchema>;
