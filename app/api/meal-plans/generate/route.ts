import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { Recipe } from "@/models/Recipe";

function currentWeek() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const recipes = await Recipe.find().select("_id").sort({ createdAt: 1 }).limit(50).lean();
  if (recipes.length === 0) return NextResponse.json({ error: "Create at least one recipe first" }, { status: 409 });

  const week = currentWeek();
  const plan = await MealPlan.findOneAndUpdate(
    { user: userId, weekStart: week.start },
    { $set: { weekEnd: week.end, generated: true }, $setOnInsert: { people: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  await Meal.deleteMany({ mealPlan: plan._id });

  const types = ["breakfast", "lunch", "dinner"] as const;
  const meals = Array.from({ length: 7 }, (_, dayIndex) =>
    types.map((type, mealIndex) => {
      const date = new Date(week.start);
      date.setUTCDate(date.getUTCDate() + dayIndex);
      return {
        mealPlan: plan._id,
        user: userId,
        recipe: recipes[(dayIndex * types.length + mealIndex) % recipes.length]!._id,
        date,
        type,
        servings: plan.people,
      };
    }),
  ).flat();
  await Meal.insertMany(meals);
  const generated = await Meal.find({ mealPlan: plan._id }).populate("recipe", "title").sort({ date: 1, type: 1 }).lean();
  return NextResponse.json({ plan, meals: generated }, { status: 201 });
}
