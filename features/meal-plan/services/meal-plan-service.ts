// Server-only: connects to MongoDB and maps documents to the client-safe
// view types. Never import this from a "use client" file.
import { NextResponse } from "next/server";
import { Types, type HydratedDocument } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Meal, type IMeal } from "@/models/Meal";
import { MealPlan, type IMealPlan } from "@/models/MealPlan";
import { Recipe, type IRecipe } from "@/models/Recipe";
import { User } from "@/models/User";
import type { MealPlanAction } from "../schemas";
import {
  DEFAULT_MEAL_TIMES,
  GENERATE_DEFAULTS,
  type MealPlanView,
  type MealType,
  type PlanCriteria,
  type PlannedMeal,
  type RecipeSnapshot,
} from "../types";
import { addUtcDays, isoOfUtc, mondayUtcOf, utcDateOf } from "./plan-dates";

export class MealPlanServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MealPlanServiceError";
  }
}

export function mealPlanErrorResponse(error: unknown): NextResponse {
  if (error instanceof MealPlanServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Turns an unexpected failure into a plain Error.
 *
 * React serialises the error it forwards to the browser and a mongoose error
 * carries a class instance inside `cause`, which React refuses to serialise:
 * the screen would crash with "Only plain objects ..." instead of showing the
 * error boundary. Only the errors of this service keep their own type.
 */
function asPlainError(error: unknown, message: string): Error {
  if (error instanceof MealPlanServiceError) return error;
  console.error("[meal-plan]", message, error);
  return new Error(message);
}

function defaultTimeFor(type: MealType): string | undefined {
  return type === "snack" ? undefined : DEFAULT_MEAL_TIMES[type];
}

/** The criteria a plan falls back to when it has never been customised. */
export function defaultCriteria(): PlanCriteria {
  return {
    days: GENERATE_DEFAULTS.days,
    mealsPerDay: GENERATE_DEFAULTS.mealsPerDay,
    extraBudget: GENERATE_DEFAULTS.extraBudget,
    people: GENERATE_DEFAULTS.people,
  };
}

function criteriaOf(plan: IMealPlan): PlanCriteria {
  const fallback = defaultCriteria();
  return {
    days: plan.days ?? fallback.days,
    mealsPerDay: plan.mealsPerDay ?? fallback.mealsPerDay,
    extraBudget: plan.extraBudget ?? fallback.extraBudget,
    people: plan.people ?? fallback.people,
  };
}

/** Writes the given criteria on the plan, leaving the untouched ones as they are. */
function applyCriteria(plan: IMealPlan, criteria: Partial<PlanCriteria>): void {
  if (criteria.people !== undefined) plan.people = criteria.people;
  if (criteria.days !== undefined) plan.days = criteria.days;
  if (criteria.mealsPerDay !== undefined) plan.mealsPerDay = criteria.mealsPerDay;
  if (criteria.extraBudget !== undefined) plan.extraBudget = criteria.extraBudget;
}

function snapshotOf(recipe: IRecipe & { _id: Types.ObjectId }): RecipeSnapshot {
  return {
    id: recipe._id.toString(),
    title: recipe.title,
    imageUrl: recipe.imageUrl ?? undefined,
    calories: recipe.nutrition.calories,
    protein: recipe.nutrition.protein,
    cost: recipe.costPerServing,
  };
}

async function loadPlanView(planId: Types.ObjectId): Promise<MealPlanView> {
  const plan = await MealPlan.findById(planId).lean();
  if (!plan) throw new MealPlanServiceError("Plan not found.", 404);

  const meals = await Meal.find({ mealPlan: plan._id }).sort({ date: 1, type: 1 }).lean();
  const recipeIds = [...new Set(meals.map((meal) => meal.recipe))];
  const recipes =
    recipeIds.length > 0 ? await Recipe.find({ _id: { $in: recipeIds } }).lean() : [];
  const recipesById = new Map(recipes.map((recipe) => [recipe._id.toString(), recipe]));

  const planned: PlannedMeal[] = [];
  for (const meal of meals) {
    const recipe = recipesById.get(meal.recipe.toString());
    if (!recipe) continue; // recipe deleted since planning: drop the meal, never crash.
    planned.push({
      id: meal._id.toString(),
      date: isoOfUtc(meal.date),
      type: meal.type,
      time: meal.time ?? undefined,
      servings: meal.servings,
      recipe: snapshotOf(recipe as IRecipe & { _id: Types.ObjectId }),
    });
  }

  const criteria = criteriaOf(plan);

  return {
    id: plan._id.toString(),
    weekStart: isoOfUtc(plan.weekStart),
    weekEnd: isoOfUtc(plan.weekEnd),
    people: criteria.people,
    budget: plan.budget ?? undefined,
    extraBudget: criteria.extraBudget,
    days: criteria.days,
    mealsPerDay: criteria.mealsPerDay,
    generated: plan.generated,
    meals: planned,
  };
}

/** True when MongoDB rejected a write because the unique index already exists. */
function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/** The plan for (user, week), created empty the first time it is opened. */
async function ensurePlan(
  userId: string,
  weekStart: Date,
): Promise<HydratedDocument<IMealPlan>> {
  const existing = await MealPlan.findOne({ user: userId, weekStart });
  if (existing) return existing;

  const user = await User.findById(userId).lean();
  const criteria = defaultCriteria();

  try {
    return await MealPlan.create({
      user: userId,
      weekStart,
      weekEnd: addUtcDays(weekStart, 6),
      people: criteria.people,
      days: criteria.days,
      mealsPerDay: criteria.mealsPerDay,
      extraBudget: criteria.extraBudget,
      budget: user?.preferences?.weeklyBudget,
      generated: false,
    });
  } catch (error) {
    // Two requests can open the same week at the same time: the unique index
    // { user, weekStart } lets one of them through, so read the plan again.
    if (isDuplicateKeyError(error)) {
      const created = await MealPlan.findOne({ user: userId, weekStart });
      if (created) return created;
    }
    throw error;
  }
}

export async function getOrCreateMealPlan(
  userId: string,
  weekStartIso: string,
): Promise<MealPlanView> {
  try {
    await connectToDatabase();
    const plan = await ensurePlan(userId, mondayUtcOf(weekStartIso));
    return await loadPlanView(plan._id);
  } catch (error) {
    throw asPlainError(error, "The meal plan could not be loaded.");
  }
}

function assertPlanId(planId: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(planId)) {
    throw new MealPlanServiceError("Invalid plan id.", 400);
  }
  return new Types.ObjectId(planId);
}

/** Parses a YYYY-MM-DD date and rejects days outside the plan's week. */
function dayInPlan(plan: IMealPlan, iso: string): Date {
  const date = utcDateOf(iso);
  if (date.getTime() < plan.weekStart.getTime() || date.getTime() > addUtcDays(plan.weekStart, 6).getTime()) {
    throw new MealPlanServiceError("Date is outside this plan's week.", 400);
  }
  return date;
}

async function requireMeal(planId: Types.ObjectId, userId: string, mealId: string) {
  if (!Types.ObjectId.isValid(mealId)) {
    throw new MealPlanServiceError("Invalid meal id.", 400);
  }
  const meal = await Meal.findOne({ _id: mealId, mealPlan: planId, user: userId });
  if (!meal) throw new MealPlanServiceError("Meal not found.", 404);
  return meal;
}

async function requireRecipe(recipeId: string) {
  const recipe = await Recipe.findById(recipeId);
  if (!recipe) throw new MealPlanServiceError("Recipe not found.", 404);
  return recipe;
}

/**
 * Applies one validated action to the user's plan and returns the updated
 * view. `duplicateWeek` returns the plan of the following week, since that is
 * the week that actually changed.
 */
export async function applyMealPlanAction(
  userId: string,
  planId: string,
  action: MealPlanAction,
): Promise<MealPlanView> {
  try {
    return await applyAction(userId, planId, action);
  } catch (error) {
    throw asPlainError(error, "The change could not be saved.");
  }
}

async function applyAction(
  userId: string,
  planId: string,
  action: MealPlanAction,
): Promise<MealPlanView> {
  await connectToDatabase();
  const plan = await MealPlan.findOne({ _id: assertPlanId(planId), user: userId });
  if (!plan) throw new MealPlanServiceError("Plan not found.", 404);

  switch (action.action) {
    case "addMeal": {
      const date = dayInPlan(plan, action.date);
      const recipe = await requireRecipe(action.recipeId);
      // One slot per day and type: replace whatever was planned there.
      await Meal.deleteMany({ mealPlan: plan._id, date, type: action.type });
      await Meal.create({
        mealPlan: plan._id,
        user: userId,
        recipe: recipe._id,
        date,
        type: action.type,
        time: action.time ?? defaultTimeFor(action.type),
        servings: action.servings,
      });
      break;
    }

    case "updateMeal": {
      const meal = await requireMeal(plan._id, userId, action.mealId);
      if (action.recipeId !== undefined) meal.recipe = (await requireRecipe(action.recipeId))._id;
      if (action.type !== undefined && action.type !== meal.type) {
        meal.type = action.type;
        meal.time = defaultTimeFor(action.type);
      } else if (action.time !== undefined) {
        meal.time = action.time ?? undefined;
      }
      if (action.servings !== undefined) meal.servings = action.servings;
      await Meal.deleteMany({
        mealPlan: plan._id,
        _id: { $ne: meal._id },
        date: meal.date,
        type: meal.type,
      });
      await meal.save();
      break;
    }

    case "moveMeal": {
      const meal = await requireMeal(plan._id, userId, action.mealId);
      const date = dayInPlan(plan, action.date);
      const previousType = meal.type;
      const type = action.type ?? previousType;
      await Meal.deleteMany({ mealPlan: plan._id, _id: { $ne: meal._id }, date, type });
      meal.date = date;
      meal.type = type;
      if (type !== previousType) meal.time = defaultTimeFor(type);
      await meal.save();
      break;
    }

    case "removeMeal": {
      if (!Types.ObjectId.isValid(action.mealId)) {
        throw new MealPlanServiceError("Invalid meal id.", 400);
      }
      await Meal.deleteMany({ _id: action.mealId, mealPlan: plan._id, user: userId });
      break;
    }

    case "duplicateDay": {
      const sourceDate = dayInPlan(plan, action.date);
      const targetDate = dayInPlan(plan, action.targetDate);
      if (targetDate.getTime() === sourceDate.getTime()) {
        throw new MealPlanServiceError("The target day must be a different day.", 400);
      }
      const sourceMeals = await Meal.find({ mealPlan: plan._id, date: sourceDate });
      if (sourceMeals.length > 0) {
        await Meal.deleteMany({ mealPlan: plan._id, date: targetDate });
        await Meal.insertMany(
          sourceMeals.map((meal: IMeal) => ({
            mealPlan: plan._id,
            user: userId,
            recipe: meal.recipe,
            date: targetDate,
            type: meal.type,
            time: meal.time,
            servings: meal.servings,
          })),
        );
      }
      break;
    }

    case "duplicateWeek": {
      const targetPlan = await ensurePlan(userId, addUtcDays(plan.weekStart, 7));
      const sourceMeals = await Meal.find({ mealPlan: plan._id }).sort({ date: 1 });
      await Meal.deleteMany({ mealPlan: targetPlan._id, user: userId });
      if (sourceMeals.length > 0) {
        await Meal.insertMany(
          sourceMeals.map((meal) => ({
            mealPlan: targetPlan._id,
            user: userId,
            recipe: meal.recipe,
            date: addUtcDays(meal.date, 7),
            type: meal.type,
            time: meal.time,
            servings: meal.servings,
          })),
        );
      }
      targetPlan.generated = plan.generated;
      applyCriteria(targetPlan, criteriaOf(plan));
      await targetPlan.save();
      return loadPlanView(targetPlan._id);
    }

    case "updateCriteria": {
      applyCriteria(plan, {
        people: action.people,
        days: action.days,
        mealsPerDay: action.mealsPerDay,
        extraBudget: action.extraBudget,
      });
      await plan.save();
      break;
    }
  }

  return loadPlanView(plan._id);
}

export async function deleteMealPlanWeek(userId: string, planId: string): Promise<void> {
  try {
    await connectToDatabase();
    const plan = await MealPlan.findOne({ _id: assertPlanId(planId), user: userId });
    if (!plan) throw new MealPlanServiceError("Plan not found.", 404);
    await Meal.deleteMany({ mealPlan: plan._id, user: userId });
    await MealPlan.deleteOne({ _id: plan._id, user: userId });
  } catch (error) {
    throw asPlainError(error, "The week could not be deleted.");
  }
}

export type PlanMealSeed = {
  date: string;
  type: MealType;
  time?: string;
  servings: number;
  recipeId: string;
};

/** Used by the generator: wipes the week's meals and writes the new ones. */
export async function replacePlanMeals(
  userId: string,
  weekStartIso: string,
  meals: PlanMealSeed[],
  generated: boolean,
  criteria?: Partial<PlanCriteria>,
): Promise<MealPlanView> {
  try {
    await connectToDatabase();
    const plan = await ensurePlan(userId, mondayUtcOf(weekStartIso));
    await Meal.deleteMany({ mealPlan: plan._id, user: userId });
    if (meals.length > 0) {
      await Meal.insertMany(
        meals.map((meal) => ({
          mealPlan: plan._id,
          user: userId,
          recipe: meal.recipeId,
          date: utcDateOf(meal.date),
          type: meal.type,
          time: meal.time,
          servings: meal.servings,
        })),
      );
    }
    plan.generated = generated;
    if (criteria) applyCriteria(plan, criteria);
    await plan.save();
    return await loadPlanView(plan._id);
  } catch (error) {
    throw asPlainError(error, "The plan could not be saved.");
  }
}
