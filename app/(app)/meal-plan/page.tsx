import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { MealPlanScreen } from "@/features/meal-plan/components/MealPlanScreen";
import { ErrorState } from "@/features/meal-plan/components/ErrorState";
import { getOrCreateMealPlan } from "@/features/meal-plan/services/meal-plan-service";
import {
  listPantryNames,
  listRecipeSnapshots,
  pendingShoppingCount,
} from "@/features/meal-plan/services/server-providers";
import { startOfWeekMonday, toISODate } from "@/features/meal-plan/services/week";

// Owner: Member 3. Screen UI lives in features/meal-plan.
// "today" and the plan are rendered on the server, so never cache statically.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.mealPlan");
  return { title: t("title") };
}

export default async function MealPlanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const today = new Date();
  const todayISO = toISODate(today);
  const weekStartIso = toISODate(startOfWeekMonday(today));

  // Everything the screen needs comes from the database: when it is
  // unreachable the screen says so instead of crashing (see the ErrorState
  // component).
  let initialPlan: Awaited<ReturnType<typeof getOrCreateMealPlan>>;
  let recipes: Awaited<ReturnType<typeof listRecipeSnapshots>>;
  let pantryNames: string[];
  let shoppingCount: number;
  try {
    [initialPlan, recipes, pantryNames, shoppingCount] = await Promise.all([
      getOrCreateMealPlan(userId, weekStartIso),
      listRecipeSnapshots(),
      listPantryNames(userId),
      pendingShoppingCount(userId),
    ]);
  } catch (error) {
    console.error("[meal-plan] meal plan screen unavailable", error);
    return <ErrorState />;
  }

  return (
    <MealPlanScreen
      todayISO={todayISO}
      initialPlan={initialPlan}
      recipes={recipes}
      pantryNames={pantryNames}
      shoppingCount={shoppingCount}
    />
  );
}
