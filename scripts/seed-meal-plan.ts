/**
 * Idempotent meal-plan seed: ONLY deletes and recreates Ahmed Benali's
 * MealPlan and Meal documents (everything else comes from scripts/seed.ts,
 * which this file never touches).
 *
 * Creates a plan for the current real week, Monday to Friday, 3 meals a day,
 * using the 4 seeded recipes.
 *
 *   npx tsx --env-file=.env scripts/seed-meal-plan.ts
 *   (same env loading as scripts/seed.ts: npm run db:seed)
 */
import mongoose, { Types } from "mongoose";
import { connectToDatabase } from "../lib/db";
import { Meal } from "../models/Meal";
import { MealPlan } from "../models/MealPlan";
import { Recipe } from "../models/Recipe";
import { User } from "../models/User";
import { DEFAULT_MEAL_TIMES, type MainMealType } from "../features/meal-plan/types";

const SLOTS: MainMealType[] = ["breakfast", "lunch", "dinner"];
const WEEK_DAYS = 5; // Monday to Friday

/** Monday 00:00 UTC of the current real week. */
function currentMonday(): Date {
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return monday;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function main() {
  await connectToDatabase();
  console.log(`Seeding meal plan in "${mongoose.connection.name}"...`);

  const ahmed = await User.findOne({ email: "ahmed.benali@mail.com" });
  if (!ahmed) {
    throw new Error("Ahmed Benali not found: run `npm run db:seed` first.");
  }

  let recipes = await Recipe.find({ createdBy: ahmed._id }).sort({ title: 1 });
  if (recipes.length === 0) recipes = await Recipe.find({}).sort({ title: 1 });
  if (recipes.length === 0) {
    throw new Error("No recipes found: run `npm run db:seed` first.");
  }

  // Only Ahmed's own planning documents are replaced.
  await Meal.deleteMany({ user: ahmed._id });
  await MealPlan.deleteMany({ user: ahmed._id });

  const weekStart = currentMonday();
  const plan = await MealPlan.create({
    user: ahmed._id,
    weekStart,
    weekEnd: addDays(weekStart, 6),
    people: 1,
    budget: ahmed.preferences.weeklyBudget,
    // The criteria of the seeded plan: Monday to Friday, 3 meals a day and no
    // extra budget on top of the weekly one.
    days: WEEK_DAYS,
    mealsPerDay: SLOTS.length,
    extraBudget: 0,
    generated: false,
  });

  const meals: { mealPlan: Types.ObjectId; user: Types.ObjectId; recipe: Types.ObjectId; date: Date; type: MainMealType; time: string; servings: number }[] = [];
  for (let day = 0; day < WEEK_DAYS; day++) {
    const date = addDays(weekStart, day);
    SLOTS.forEach((type, slotIndex) => {
      const recipe = recipes[(day * SLOTS.length + slotIndex) % recipes.length]!;
      meals.push({
        mealPlan: plan._id,
        user: ahmed._id,
        recipe: recipe._id,
        date,
        type,
        time: DEFAULT_MEAL_TIMES[type],
        servings: 1,
      });
    });
  }
  await Meal.insertMany(meals);

  const mondayLabel = weekStart.toISOString().slice(0, 10);
  console.log(
    `Done: meal plan for week ${mondayLabel} (Mon-Fri, ${meals.length} meals, ${recipes.length} recipes).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
