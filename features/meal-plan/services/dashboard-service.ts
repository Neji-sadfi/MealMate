// Server-only dashboard aggregation for the Home screen.
// Own data (meal plan, meals, recipes) is authoritative; every read of another
// member's collection (budget, shopping, inventory, sport) is wrapped in
// try/catch with a typed fallback so their changes cannot crash this page.
import { estimatedItemCost } from "@/features/shopping/services/cost";
import { connectToDatabase } from "@/lib/db";
import { dailyTargets, type DailyTargets } from "@/lib/nutrition-targets";
import { Budget } from "@/models/Budget";
import { Ingredient } from "@/models/Ingredient";
import { Inventory } from "@/models/Inventory";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { Recipe } from "@/models/Recipe";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";
import { User, type IUserPreferences } from "@/models/User";
import { WorkoutSession } from "@/models/WorkoutSession";
import type { DashboardData, PlannedMeal } from "../types";
import { isoOfUtc, mondayUtcOf } from "./plan-dates";
import { toISODate } from "./week";

const DAY_MS = 86_400_000;

/**
 * Thrown when MongoDB cannot be reached.
 *
 * It is deliberately a plain Error without a `cause`: React serialises the
 * error it forwards to the browser, and a mongoose error carries a class
 * instance (TopologyDescription) inside `cause`, which React refuses to
 * serialise and turns into an "Only plain objects ..." crash.
 */
export class DashboardUnavailableError extends Error {
  constructor() {
    super("The dashboard is temporarily unavailable.");
    this.name = "DashboardUnavailableError";
  }
}

type OwnData = {
  preferences: IUserPreferences | undefined;
  targets: DailyTargets;
  /** People the week is cooked for: the stats are shown per person. */
  people: number;
  planned: PlannedMeal[];
};

function safeDatabaseErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { name: "UnknownError" };
  const details = error as Error & {
    code?: string | number;
    syscall?: string;
    hostname?: string;
  };
  return {
    name: details.name,
    ...(details.code !== undefined ? { code: details.code } : {}),
    ...(details.syscall ? { syscall: details.syscall } : {}),
    ...(details.hostname ? { hostname: details.hostname } : {}),
    message: details.message.replace(
      /mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi,
      "[redacted MongoDB URI]",
    ),
  };
}

/** Reads my own collections. A failure here means the dashboard cannot load. */
async function loadOwnData(userId: string, weekStart: Date): Promise<OwnData> {
  try {
    await connectToDatabase();

    const user = await User.findById(userId).lean();
    const preferences = user?.preferences;
    const targets = dailyTargets(user);
    const plan = await MealPlan.findOne({ user: userId, weekStart }).lean();
    if (!plan) return { preferences, targets, people: 1, planned: [] };

    const meals = await Meal.find({ mealPlan: plan._id }).sort({ date: 1 }).lean();
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
        recipe: {
          id: recipe._id.toString(),
          title: recipe.title,
          imageUrl: recipe.imageUrl ?? undefined,
          calories: recipe.nutrition.calories,
          protein: recipe.nutrition.protein,
          cost: recipe.costPerServing,
        },
      });
    }

    return { preferences, targets, people: Math.max(1, plan.people ?? 1), planned };
  } catch (error) {
    console.error("[meal-plan] dashboard data unavailable", safeDatabaseErrorDetails(error));
    throw new DashboardUnavailableError();
  }
}

export async function getDashboardData(
  userId: string,
  now: Date = new Date(),
): Promise<DashboardData> {
  // "Today" is a local calendar day. The database stores every date at UTC
  // midnight, so the local day is converted once here and every other date
  // of the request is derived from it.
  const todayIso = toISODate(now);
  const weekStart = mondayUtcOf(todayIso);

  const { preferences, targets, people, planned } = await loadOwnData(userId, weekStart);

  const todayMeals = planned.filter((meal) => meal.date === todayIso);
  // Average over the days that actually have meals, not over the whole week.
  const divisor = Math.max(1, new Set(planned.map((meal) => meal.date)).size);
  const avgKcal = Math.round(
    planned.reduce((sum, meal) => sum + meal.recipe.calories * meal.servings, 0) / divisor / people,
  );
  const avgProtein = Math.round(
    planned.reduce((sum, meal) => sum + meal.recipe.protein * meal.servings, 0) / divisor / people,
  );

  // --- Member 4: budget for this week ---
  // The Budget document wins over the profile preference: the user can change
  // the limit and the currency from the budget screen at any time.
  let budgetTotal = preferences?.weeklyBudget ?? 0;
  let budgetCurrency = preferences?.currency ?? "TND";
  let used = 0;
  try {
    const week = weekStart.getTime();
    const budget = await Budget.findOne({
      user: userId,
      weekStart: {
        $gte: new Date(week - DAY_MS / 2),
        $lte: new Date(week + DAY_MS / 2),
      },
    }).lean();
    if (budget) {
      if (typeof budget.limit === "number") budgetTotal = budget.limit;
      if (budget.currency) budgetCurrency = budget.currency;
      used = (budget.expenses ?? []).reduce((sum, expense) => sum + expense.amount, 0);
    }
  } catch {
    used = 0;
  }

  // --- Member 4: items still to buy and the list's estimated total ---
  let shopping: DashboardData["shopping"] = { count: 0, estimatedTotal: 0 };
  try {
    const list = await ShoppingList.findOne({ user: userId })
      .sort({ weekStart: -1, createdAt: -1 })
      .lean();
    if (list) {
      const items = await ShoppingItem.find({ list: list._id, checked: false })
        .populate<{ ingredient: { estimatedPrice?: number } | null }>(
          "ingredient",
          "estimatedPrice",
        )
        .lean();
      const total = items.reduce(
        (sum, item) =>
          sum +
          (estimatedItemCost({
            estimatedPrice: item.estimatedPrice ?? item.ingredient?.estimatedPrice,
            quantity: item.quantity,
            unit: item.unit,
          }) ?? 0),
        0,
      );
      shopping = { count: items.length, estimatedTotal: Math.round(total * 100) / 100 };
    }
  } catch {
    shopping = { count: 0, estimatedTotal: 0 };
  }

  // --- Member 4 + Member 2: nearest inventory expiry ---
  let nearestExpiry: DashboardData["nearestExpiry"] = null;
  try {
    const item = await Inventory.findOne({ user: userId, expiresAt: { $gte: now } })
      .sort({ expiresAt: 1 })
      .lean();
    if (item?.expiresAt) {
      const ingredient = await Ingredient.findById(item.ingredient).select("name").lean();
      if (ingredient) {
        nearestExpiry = {
          name: ingredient.name,
          quantity: item.quantity,
          unit: item.unit,
          // The alert counts calendar days, so the instant becomes a local day.
          expiresOn: toISODate(item.expiresAt),
        };
      }
    }
  } catch {
    nearestExpiry = null;
  }

  // --- Member 6: next planned workout ---
  let nextWorkout: DashboardData["nextWorkout"] = null;
  try {
    const workout = await WorkoutSession.findOne({
      user: userId,
      status: "planned",
      scheduledAt: { $gte: now },
    })
      .sort({ scheduledAt: 1 })
      .lean();
    if (workout) {
      nextWorkout = {
        name: workout.name,
        durationMinutes: workout.durationMinutes,
        scheduledAt: workout.scheduledAt.toISOString(),
      };
    }
  } catch {
    nextWorkout = null;
  }

  return {
    budget: {
      total: budgetTotal,
      used,
      remaining: Math.max(0, budgetTotal - used),
      currency: budgetCurrency,
    },
    stats: { avgKcal, avgProtein, kcalTarget: targets.kcal, proteinTarget: targets.protein },
    todayMeals,
    shopping,
    nearestExpiry,
    nextWorkout,
  };
}
