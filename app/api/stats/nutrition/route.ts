import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { Budget } from "@/models/Budget";
import { Meal } from "@/models/Meal";
import { User } from "@/models/User";

function periodRange(period: string | null) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (period !== "month") {
    start.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  }
  const end = new Date(start);
  if (period !== "month") end.setUTCDate(end.getUTCDate() + 7);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end, period: period === "month" ? "month" : "week" };
}

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const range = periodRange(new URL(request.url).searchParams.get("period"));
  const [meals, budgets, user] = await Promise.all([
    Meal.find({ user: userId, date: { $gte: range.start, $lt: range.end } })
      .populate("recipe", "nutrition")
      .populate("mealPlan", "people")
      .lean(),
    Budget.find({ user: userId }).lean(),
    User.findById(userId).select("preferences.weeklyBudget preferences.currency").lean(),
  ]);
  const nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of meals) {
    const recipe = meal.recipe as unknown as { nutrition: typeof nutrition } | null;
    if (!recipe?.nutrition) continue;
    const plan = meal.mealPlan as unknown as { people?: number } | null;
    const portions = meal.servings / Math.max(1, plan?.people ?? 1);
    nutrition.calories += recipe.nutrition.calories * portions;
    nutrition.protein += recipe.nutrition.protein * portions;
    nutrition.carbs += recipe.nutrition.carbs * portions;
    nutrition.fat += recipe.nutrition.fat * portions;
  }
  const budgetSpent = budgets.reduce(
    (sum, budget) =>
      sum +
      budget.expenses.reduce((subtotal, expense) => {
        const date = new Date(expense.date);
        return date >= range.start && date < range.end ? subtotal + expense.amount : subtotal;
      }, 0),
    0,
  );
  const targetBudget =
    range.period === "week"
      ? (budgets.find((budget) => budget.weekStart.getTime() === range.start.getTime())?.limit ??
        user?.preferences.weeklyBudget ??
        0)
      : Math.round(
          (user?.preferences.weeklyBudget ?? 0) *
            ((range.end.getTime() - range.start.getTime()) / (7 * 24 * 60 * 60 * 1000)),
        );
  return NextResponse.json({
    period: range.period,
    ...Object.fromEntries(
      Object.entries(nutrition).map(([key, value]) => [key, Math.round(value)]),
    ),
    budgetSpent,
    targetBudget,
    currency: user?.preferences.currency ?? "TND",
  });
}
