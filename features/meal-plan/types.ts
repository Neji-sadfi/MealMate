// Client-safe types for the meal planning + home module (Member 3).
// Do not import Mongoose models from client components: map documents to these types.

// Meal types and weekday keys are shared with the models, so the value stored
// in MongoDB and the value rendered by the UI can never drift apart.
import { MEAL_TYPES, WEEKDAYS, type MealType, type Weekday } from "@/models/enums";

export { MEAL_TYPES, WEEKDAYS };
export type { MealType, Weekday };

export const MAIN_MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
export type MainMealType = (typeof MAIN_MEAL_TYPES)[number];

export const DEFAULT_MEAL_TIMES: Record<MainMealType, string> = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "20:00",
};

export function timeForType(type: MealType): string | undefined {
  if (type === "snack") return undefined;
  return DEFAULT_MEAL_TIMES[type];
}

/** Defaults of the rule-based generator, used when a plan has no criteria yet. */
export const GENERATE_DEFAULTS = {
  days: 5,
  mealsPerDay: 3,
  extraBudget: 50,
  people: 1,
} as const;

/**
 * Bounds the criteria card offers. They mirror the zod schemas, so the UI can
 * never send a value the API would reject.
 */
export const CRITERIA_LIMITS = {
  days: { min: 1, max: 7 },
  mealsPerDay: { min: 1, max: 4 },
  people: { min: 1, max: 12 },
  extraBudget: { min: 0, max: 10_000 },
} as const;

export type RecipeSnapshot = {
  id: string;
  title: string;
  imageUrl?: string;
  calories: number;
  protein: number;
  /** costPerServing in DT. Optional: the old mock recipes had no price. */
  cost?: number;
};

export type PlannedMeal = {
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  type: MealType;
  time?: string;
  servings: number;
  recipe: RecipeSnapshot;
};

/** The criteria the generator uses: editable from the meal-plan screen. */
export type PlanCriteria = {
  /** Number of days to plan, starting on the Monday of the week. */
  days: number;
  /** Meals per day: 3 main meals, 4 adds a snack. */
  mealsPerDay: number;
  /** Extra budget on top of the weekly budget from the profile. */
  extraBudget: number;
  /** How many people the plan is cooked for: it drives the servings. */
  people: number;
};

export type MealPlanView = {
  id: string;
  weekStart: string;
  weekEnd: string;
  people: number;
  budget?: number;
  extraBudget: number;
  days: number;
  mealsPerDay: number;
  generated: boolean;
  meals: PlannedMeal[];
};

export type WeekStripDay = {
  date: string;
  weekday: Weekday;
  hasMeals: boolean;
};

/** Home dashboard payload. Built server-side; the screen only renders it. */
export type DashboardBudget = {
  total: number;
  used: number;
  remaining: number;
  currency: string;
};

export type DashboardStats = {
  avgKcal: number;
  avgProtein: number;
  kcalTarget: number;
  proteinTarget: number;
};

export type DashboardShopping = {
  count: number;
  estimatedTotal: number;
};

export type DashboardExpiry = {
  name: string;
  quantity: number;
  unit: string;
  /** Local calendar day the item runs out, YYYY-MM-DD. */
  expiresOn: string;
} | null;

export type DashboardWorkout = {
  name: string;
  durationMinutes: number;
  scheduledAt: string;
} | null;

export type DashboardData = {
  budget: DashboardBudget;
  stats: DashboardStats;
  todayMeals: PlannedMeal[];
  shopping: DashboardShopping;
  nearestExpiry: DashboardExpiry;
  nextWorkout: DashboardWorkout;
};

/**
 * Machine-readable generator feedback: the screen turns each code into an
 * English message through next-intl (no hard-coded UI text on the server).
 */
export type GeneratorWarning =
  | { code: "noValidRecipes" }
  | { code: "overBudget"; cost: number; budget: number }
  | { code: "kcalTarget"; kcal: number; target: number }
  | { code: "reused" };
