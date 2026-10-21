import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/current-user";
import { MealPlanActions } from "@/features/meal-plan/components/MealPlanActions";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { Recipe } from "@/models/Recipe";

function currentWeekStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.mealPlan");
  return { title: t("title") };
}

export default async function MealPlanPage() {
  const t = await getTranslations("pages.mealPlan");
  const userId = await getCurrentUserId();
  const [plan, recipes] = userId
    ? await Promise.all([
        MealPlan.findOne({ user: userId, weekStart: currentWeekStart() }).lean(),
        Recipe.find().select("title").sort({ title: 1 }).lean(),
      ])
    : [null, []];
  const meals = plan ? await Meal.find({ mealPlan: plan._id }).populate("recipe", "title").sort({ date: 1, type: 1 }).lean() : [];
  const formatter = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1"><h1 className="text-2xl font-black">{t("title")}</h1><p className="text-sm text-muted">{t("subtitle")}</p></section>
      <MealPlanActions recipes={recipes.map((recipe) => ({ id: recipe._id.toString(), title: recipe.title }))} />
      {meals.length === 0 ? (
        <Card><h2 className="font-bold">No meals planned this week</h2><p className="mt-1 text-sm text-muted">Your meal plan will show meals saved to your account.</p></Card>
      ) : meals.map((meal) => {
        const recipe = meal.recipe as unknown as { title: string };
        return (
          <Card key={meal._id.toString()} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{formatter.format(new Date(meal.date))}</p>
            <p className="text-lg font-bold">{recipe.title}</p>
            <p className="text-sm capitalize text-muted">{meal.type} · {meal.servings} serving{meal.servings === 1 ? "" : "s"}</p>
          </Card>
        );
      })}
    </div>
  );
}
