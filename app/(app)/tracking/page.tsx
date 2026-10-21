import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { BudgetActions } from "@/features/community/components/BudgetActions";
import { getCurrentUserId } from "@/lib/current-user";
import { Budget } from "@/models/Budget";
import { Meal } from "@/models/Meal";
import { User } from "@/models/User";

function getPeriod(period: string | undefined) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (period !== "month") {
    start.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  }
  const end = new Date(start);
  if (period !== "month") end.setUTCDate(end.getUTCDate() + 7);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end, period: period === "month" ? ("month" as const) : ("week" as const) };
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.tracking");
  return { title: t("title") };
}

export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const t = await getTranslations("pages.tracking");
  const userId = await getCurrentUserId();
  const { period, start, end } = getPeriod((await searchParams).period);
  const [meals, budgets, user] = userId
    ? await Promise.all([
        Meal.find({ user: userId, date: { $gte: start, $lt: end } })
          .populate("recipe", "nutrition")
          .lean(),
        Budget.find({ user: userId }).lean(),
        User.findById(userId).select("preferences.weeklyBudget preferences.currency").lean(),
      ])
    : [[], [], null];
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of meals) {
    const recipe = meal.recipe as unknown as { nutrition: typeof totals } | null;
    if (!recipe?.nutrition) continue;
    totals.calories += recipe.nutrition.calories * meal.servings;
    totals.protein += recipe.nutrition.protein * meal.servings;
    totals.carbs += recipe.nutrition.carbs * meal.servings;
    totals.fat += recipe.nutrition.fat * meal.servings;
  }
  const spent = budgets.reduce(
    (sum, budget) =>
      sum +
      budget.expenses.reduce((subtotal, expense) => {
        const date = new Date(expense.date);
        return date >= start && date < end ? subtotal + expense.amount : subtotal;
      }, 0),
    0,
  );
  const budgetLimit =
    period === "week"
      ? (budgets.find((budget) => budget.weekStart.getTime() === start.getTime())?.limit ??
        user?.preferences.weeklyBudget ??
        0)
      : Math.round(
          (user?.preferences.weeklyBudget ?? 0) *
            ((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)),
        );
  const currency = user?.preferences.currency ?? "TND";

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </section>
      <nav className="flex gap-2 text-sm font-semibold">
        <a
          className={
            period === "week"
              ? "rounded-full bg-primary px-4 py-2 text-white"
              : "rounded-full bg-surface px-4 py-2"
          }
          href="/tracking?period=week"
        >
          Weekly
        </a>
        <a
          className={
            period === "month"
              ? "rounded-full bg-primary px-4 py-2 text-white"
              : "rounded-full bg-surface px-4 py-2"
          }
          href="/tracking?period=month"
        >
          Monthly
        </a>
      </nav>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">This {period}</p>
      <div className="grid grid-cols-2 gap-3">
        <Card tone="tint">
          <p className="text-xs tracking-wide text-muted uppercase">Calories</p>
          <p className="mt-2 text-2xl font-black">{Math.round(totals.calories)}</p>
        </Card>
        <Card tone="tint">
          <p className="text-xs tracking-wide text-muted uppercase">Protein</p>
          <p className="mt-2 text-2xl font-black">{Math.round(totals.protein)}g</p>
        </Card>
        <Card tone="tint">
          <p className="text-xs tracking-wide text-muted uppercase">Carbs</p>
          <p className="mt-2 text-2xl font-black">{Math.round(totals.carbs)}g</p>
        </Card>
        <Card tone="tint">
          <p className="text-xs tracking-wide text-muted uppercase">Fat</p>
          <p className="mt-2 text-2xl font-black">{Math.round(totals.fat)}g</p>
        </Card>
      </div>
      <Card>
        <p className="text-xs tracking-wide text-muted uppercase">Budget spent</p>
        <p className="mt-2 text-2xl font-black">
          {spent} / {budgetLimit} {currency}
        </p>
      </Card>
      {period === "week" && <BudgetActions currentLimit={budgetLimit} />}
      {meals.length === 0 && (
        <p className="text-sm text-muted">
          Nutrition totals update from meals you add to your weekly plan.
        </p>
      )}
    </div>
  );
}
