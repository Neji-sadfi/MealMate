import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/current-user";
import { Favorite } from "@/models/Favorite";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { Recipe } from "@/models/Recipe";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";
import { User } from "@/models/User";
import { WorkoutSession } from "@/models/WorkoutSession";

function currentWeekStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.home");
  return { title: t("title", { name: "MealMate" }) };
}

export default async function HomePage() {
  const t = await getTranslations("pages.home");
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const weekStart = currentWeekStart();
  const [user, recipeCount, favorites, list, plan, nextWorkout] = await Promise.all([
    User.findById(userId).select("name preferences").lean(),
    Recipe.countDocuments(),
    Favorite.countDocuments({ user: userId }),
    ShoppingList.findOne({ user: userId, weekStart }).select("_id").lean(),
    MealPlan.findOne({ user: userId, weekStart }).select("_id").lean(),
    WorkoutSession.findOne({ user: userId, scheduledAt: { $gte: new Date() }, status: "planned" }).sort({ scheduledAt: 1 }).lean(),
  ]);
  const [shoppingCount, meals] = await Promise.all([
    list ? ShoppingItem.countDocuments({ list: list._id, checked: false }) : 0,
    plan ? Meal.find({ mealPlan: plan._id }).populate("recipe", "title").sort({ date: 1, type: 1 }).limit(5).lean() : [],
  ]);
  const firstName = user?.name.split(/\s+/)[0] ?? "there";
  const weeklyBudget = user?.preferences.weeklyBudget ?? 0;
  const currency = user?.preferences.currency ?? "TND";

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">MealMate</p>
        <h1 className="text-3xl font-black leading-tight">{t("title", { name: firstName })}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/recipes"><Card tone="tint"><p className="text-xs uppercase tracking-wide text-muted">Recipes</p><p className="mt-2 text-2xl font-black">{recipeCount}</p></Card></Link>
        <Link href="/recipes"><Card tone="tint"><p className="text-xs uppercase tracking-wide text-muted">Favorites</p><p className="mt-2 text-2xl font-black">{favorites}</p></Card></Link>
        <Link href="/shopping"><Card tone="tint"><p className="text-xs uppercase tracking-wide text-muted">To buy</p><p className="mt-2 text-2xl font-black">{shoppingCount}</p></Card></Link>
        <Link href="/tracking"><Card tone="tint"><p className="text-xs uppercase tracking-wide text-muted">Weekly budget</p><p className="mt-2 text-2xl font-black">{weeklyBudget} {currency}</p></Card></Link>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Next workout</p>
            <h2 className="mt-1 text-lg font-bold">{nextWorkout?.name ?? "No workout scheduled"}</h2>
          </div>
          <Link href="/sport"><Button variant="secondary" className="h-10 rounded-xl">View</Button></Link>
        </div>
      </Card>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Upcoming meals</h2><Link href="/meal-plan" className="text-sm font-semibold text-primary">View plan</Link></div>
        {meals.length === 0 ? (
          <Card><p className="text-sm text-muted">Your saved meals will appear here.</p></Card>
        ) : meals.map((meal) => {
          const recipe = meal.recipe as unknown as { title: string };
          return <Card key={meal._id.toString()} className="flex items-center justify-between gap-3"><div><p className="font-semibold">{recipe.title}</p><p className="text-sm capitalize text-muted">{meal.type} · {new Date(meal.date).toLocaleDateString()}</p></div><span className="text-xs text-muted">{meal.servings} serving{meal.servings === 1 ? "" : "s"}</span></Card>;
        })}
      </section>
    </div>
  );
}
