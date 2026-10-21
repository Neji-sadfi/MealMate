import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { Types } from "mongoose";

function currentWeek() {
  const date = new Date();
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  date.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start: date, end };
}

const mealInput = z.object({
  date: z.coerce.date(),
  recipe: z.string().refine(Types.ObjectId.isValid, "Invalid recipe id"),
  type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  servings: z.number().int().min(1).max(20).default(1),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const week = currentWeek();
  const plan = await MealPlan.findOneAndUpdate(
    { user: userId, weekStart: week.start },
    { $setOnInsert: { weekEnd: week.end, people: 1, generated: false } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  const meals = await Meal.find({ mealPlan: plan._id })
    .populate("recipe", "title imageUrl prepTimeMinutes nutrition")
    .sort({ date: 1, type: 1 })
    .lean();

  return NextResponse.json({ plan, meals });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = mealInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meal", issues: parsed.error.issues }, { status: 400 });
  }

  const week = currentWeek();
  const plan = await MealPlan.findOneAndUpdate(
    { user: userId, weekStart: week.start },
    { $setOnInsert: { weekEnd: week.end, people: 1, generated: false } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  const meal = await Meal.create({
    ...parsed.data,
    recipe: new Types.ObjectId(parsed.data.recipe),
    mealPlan: plan._id,
    user: userId,
  });
  await meal.populate("recipe", "title imageUrl prepTimeMinutes nutrition");
  return NextResponse.json(meal, { status: 201 });
}
