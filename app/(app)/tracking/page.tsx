import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { PhotoHero } from "@/components/ui/PhotoHero";
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
  const locale = await getLocale();
  const userId = await getCurrentUserId();
  const { period, start, end } = getPeriod((await searchParams).period);
  const [meals, budgets, user] = userId
    ? await Promise.all([
        Meal.find({ user: userId, date: { $gte: start, $lt: end } })
          .populate("recipe", "nutrition")
          .populate("mealPlan", "people")
          .lean(),
        Budget.find({ user: userId }).lean(),
        User.findById(userId).select("preferences.weeklyBudget preferences.currency").lean(),
      ])
    : [[], [], null];

  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of meals) {
    const recipe = meal.recipe as unknown as { nutrition: typeof totals } | null;
    if (!recipe?.nutrition) continue;
    // Totals are for the user, not for everyone the meal was cooked for.
    const plan = meal.mealPlan as unknown as { people?: number } | null;
    const portions = meal.servings / Math.max(1, plan?.people ?? 1);
    totals.calories += recipe.nutrition.calories * portions;
    totals.protein += recipe.nutrition.protein * portions;
    totals.carbs += recipe.nutrition.carbs * portions;
    totals.fat += recipe.nutrition.fat * portions;
  }

  const expenses = budgets
    .flatMap((budget) =>
      budget.expenses
        .filter((expense) => {
          const date = new Date(expense.date);
          return date >= start && date < end;
        })
        .map((expense, index) => ({
          id: `${budget._id.toString()}-${index}`,
          label: expense.label,
          category: expense.category,
          amount: expense.amount,
          date: new Date(expense.date),
        })),
    )
    .sort((left, right) => right.date.getTime() - left.date.getTime());
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const weeklyLimit =
    budgets.find((budget) => budget.weekStart.getTime() === getPeriod(undefined).start.getTime())
      ?.limit ??
    user?.preferences.weeklyBudget ??
    0;
  const budgetLimit =
    period === "week"
      ? (budgets.find((budget) => budget.weekStart.getTime() === start.getTime())?.limit ??
        user?.preferences.weeklyBudget ??
        0)
      : Math.round(weeklyLimit * ((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  const currency = user?.preferences.currency ?? "TND";
  const budgetProgress = budgetLimit > 0 ? Math.round((spent / budgetLimit) * 100) : 0;
  const dateLocale = locale === "fr" ? "fr-FR" : "en-US";
  const dateFormat = new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium" });
  const periodLabel = period === "week" ? t("period.thisWeek") : t("period.thisMonth");
  const remaining = budgetLimit - spent;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PhotoHero image="tracking" title={t("title")} subtitle={t("subtitle")} />

      <nav
        aria-label={t("period.label")}
        className="flex w-fit gap-1 rounded-full bg-surface p-1 shadow-sm"
      >
        {(["week", "month"] as const).map((option) => (
          <Link
            key={option}
            href={`/tracking?period=${option}`}
            aria-current={period === option ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              period === option
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:text-primary"
            }`}
          >
            {t(`period.${option}`)}
          </Link>
        ))}
      </nav>

      <section aria-label={t("nutrition.label")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(["calories", "protein", "carbs", "fat"] as const).map((key) => (
          <Card key={key} className="border border-border/70 bg-surface shadow-sm">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">
              {t(`nutrition.${key}`)}
            </p>
            <p className="mt-2 text-2xl font-black">
              {Math.round(totals[key])}
              {key === "calories" ? " kcal" : " g"}
            </p>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden border border-border/70 bg-surface p-0 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="text-xs font-bold tracking-wide text-muted uppercase">{periodLabel}</p>
            <h2 className="mt-1 text-xl font-black">{t("budget.title")}</h2>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-primary">
              {spent.toFixed(2)} <span className="text-sm">{currency}</span>
            </p>
            <p className="text-xs text-muted">
              {t("budget.of")} {budgetLimit.toFixed(2)} {currency}
            </p>
          </div>
        </div>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div
            role="progressbar"
            aria-label={t("budget.progress", { percent: budgetProgress })}
            aria-valuenow={budgetProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-3 overflow-hidden rounded-full bg-tint"
          >
            <div
              className={`h-full rounded-full transition-[width] ${
                budgetProgress > 100 ? "bg-danger" : "bg-primary"
              }`}
              style={{ width: `${Math.min(budgetProgress, 100)}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted">{t("budget.progress", { percent: budgetProgress })}</span>
            <span className={`font-bold ${remaining < 0 ? "text-danger" : "text-primary"}`}>
              {remaining < 0 ? t("budget.overspent") : t("budget.remaining")}:{" "}
              {Math.abs(remaining).toFixed(2)} {currency}
            </span>
          </div>
        </div>
      </Card>

      {period === "week" && <BudgetActions currentLimit={budgetLimit} />}

      <Card className="border border-border/70 bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t("budget.expenses")}</h2>
          <span className="rounded-full bg-tint px-3 py-1 text-xs font-bold text-primary">
            {expenses.length}
          </span>
        </div>
        {expenses.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("budget.noExpenses")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/70">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{expense.label}</p>
                  <p className="mt-1 text-xs text-muted">
                    {t(`budget.categories.${expense.category}`)} · {dateFormat.format(expense.date)}
                  </p>
                </div>
                <span className="shrink-0 font-bold">
                  {expense.amount.toFixed(2)} {currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {meals.length === 0 && <p className="text-sm text-muted">{t("nutrition.empty")}</p>}
    </div>
  );
}
