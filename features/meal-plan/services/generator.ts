// Pure rule-based week generator: no DB access, no fetch, no models.
// Given recipes, the user's preferences and an optional pantry list, it
// fills `days x mealsPerDay` slots and explains itself with typed warnings
// (the screen turns each code into an English next-intl message).
import {
  DEFAULT_MEAL_TIMES,
  GENERATE_DEFAULTS,
  MAIN_MEAL_TYPES,
  type GeneratorWarning,
  type MealType,
  type RecipeSnapshot,
} from "../types";
import { addDays, parseISODate, toISODate } from "./week";

export type GeneratorRecipe = RecipeSnapshot & {
  diets: string[];
  ingredientNames: string[];
};

export type GeneratorPreferences = {
  diet: string;
  allergies: string[];
  kcalTarget: number;
  proteinTarget: number;
  weeklyBudget: number;
};

export type GeneratorInput = {
  weekStart: string;
  recipes: GeneratorRecipe[];
  preferences: GeneratorPreferences;
  extraBudget?: number;
  inventoryNames?: string[];
  days?: number;
  mealsPerDay?: number;
  /** How many people the plan is cooked for: it drives the servings. */
  people?: number;
};

export type GeneratedMeal = {
  date: string;
  type: MealType;
  time?: string;
  servings: number;
  recipe: GeneratorRecipe;
};

export type GeneratedPlan = {
  meals: GeneratedMeal[];
  warnings: GeneratorWarning[];
};

/** Rough share of the daily kcal target per slot (sums to ~1). */
const SLOT_KCAL_SHARE: Record<MealType, number> = {
  breakfast: 0.3,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.05,
};

function costOf(recipe: GeneratorRecipe): number {
  return recipe.cost ?? 0;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function generatePlan(input: GeneratorInput): GeneratedPlan {
  const days = input.days ?? GENERATE_DEFAULTS.days;
  const mealsPerDay = input.mealsPerDay ?? GENERATE_DEFAULTS.mealsPerDay;
  const extraBudget = input.extraBudget ?? GENERATE_DEFAULTS.extraBudget;
  // One meal is cooked for the whole group: the servings scale the cost and
  // the calories of every slot.
  const servings = Math.max(1, input.people ?? GENERATE_DEFAULTS.people);
  const budget = Math.max(0, input.preferences.weeklyBudget + extraBudget);
  // A weekly budget of 0 means "not set", not "nothing to spend".
  const hasBudget = input.preferences.weeklyBudget > 0;
  const warnings: GeneratorWarning[] = [];

  // 1. Exclude recipes that break the diet or the allergies.
  const diet = input.preferences.diet;
  const allergyTerms = input.preferences.allergies
    .map((allergy) => allergy.trim().toLowerCase())
    .filter(Boolean);
  const valid = input.recipes.filter((recipe) => {
    if (diet !== "none" && !recipe.diets.includes(diet)) return false;
    const haystack = recipe.ingredientNames.join(" ").toLowerCase();
    return !allergyTerms.some((term) => haystack.includes(term));
  });

  if (valid.length === 0) {
    return { meals: [], warnings: [{ code: "noValidRecipes" }] };
  }

  // Fewer meals keep the main ones: dinner alone, or lunch and dinner.
  const types: MealType[] =
    mealsPerDay >= 4 ? [...MAIN_MEAL_TYPES, "snack"] : MAIN_MEAL_TYPES.slice(3 - mealsPerDay);
  const totalShare = types.reduce((sum, type) => sum + SLOT_KCAL_SHARE[type], 0);
  const dates = Array.from({ length: days }, (_, index) =>
    toISODate(addDays(parseISODate(input.weekStart), index)),
  );

  const inventory = new Set((input.inventoryNames ?? []).map((name) => name.trim().toLowerCase()));
  const usage = new Map<string, number>();
  const meals: GeneratedMeal[] = [];
  let remaining = hasBudget ? budget : Number.POSITIVE_INFINITY;
  let exceededBudget = false;
  let reused = false;

  function inventoryShare(recipe: GeneratorRecipe): number {
    if (inventory.size === 0 || recipe.ingredientNames.length === 0) return 0;
    const stocked = recipe.ingredientNames.filter((name) =>
      inventory.has(name.trim().toLowerCase()),
    ).length;
    return stocked / recipe.ingredientNames.length;
  }

  function take(
    counts: Map<string, number>,
    recipe: GeneratorRecipe,
    date: string,
    type: MealType,
  ) {
    const nextCount = (counts.get(recipe.id) ?? 0) + 1;
    counts.set(recipe.id, nextCount);
    if (nextCount > 2) reused = true;
    meals.push({
      date,
      type,
      time: type === "snack" ? undefined : DEFAULT_MEAL_TIMES[type],
      servings,
      recipe,
    });
  }

  // 2. Greedy fill: prefer recipes whose ingredients are in the pantry, then
  //    the kcal fit of the slot, then the cheapest, while the budget lasts
  //    and no recipe is used more than twice a week.
  for (const date of dates) {
    for (const type of types) {
      // recipe.calories is per serving, so the slot is compared for one person.
      const slotKcal = (input.preferences.kcalTarget * SLOT_KCAL_SHARE[type]) / totalShare;
      const fresh = valid.filter((recipe) => (usage.get(recipe.id) ?? 0) < 2);
      const affordable = fresh.filter((recipe) => costOf(recipe) * servings <= remaining);
      const pool = affordable.length > 0 ? affordable : fresh.length > 0 ? fresh : valid;

      const chosen = [...pool].sort((a, b) => {
        const byInventory = inventoryShare(b) - inventoryShare(a);
        if (byInventory !== 0) return byInventory;
        const byKcal = Math.abs(a.calories - slotKcal) - Math.abs(b.calories - slotKcal);
        if (byKcal !== 0) return byKcal;
        const byCost = costOf(a) - costOf(b);
        return byCost !== 0 ? byCost : a.id.localeCompare(b.id);
      })[0]!;

      if (costOf(chosen) * servings > remaining) exceededBudget = true;
      remaining -= costOf(chosen) * servings;
      take(usage, chosen, date, type);
    }
  }

  // 3. Budget cannot be met: return the cheapest valid plan instead.
  if (exceededBudget) {
    meals.length = 0;
    usage.clear();
    remaining = budget;
    const cheapestFirst = [...valid].sort(
      (a, b) => costOf(a) - costOf(b) || a.id.localeCompare(b.id),
    );
    for (const date of dates) {
      for (const type of types) {
        const freshCheapest = cheapestFirst.filter((recipe) => (usage.get(recipe.id) ?? 0) < 2);
        const chosen = freshCheapest[0] ?? cheapestFirst[0]!;
        remaining -= costOf(chosen) * servings;
        take(usage, chosen, date, type);
      }
    }
  }

  const totalCost = roundMoney(
    meals.reduce((sum, meal) => sum + costOf(meal.recipe) * meal.servings, 0),
  );
  const totalKcal = meals.reduce((sum, meal) => sum + meal.recipe.calories * meal.servings, 0);
  const kcalTarget = input.preferences.kcalTarget * days * servings;

  if (hasBudget && totalCost > budget) {
    warnings.push({ code: "overBudget", cost: totalCost, budget: roundMoney(budget) });
  }
  if (kcalTarget > 0 && Math.abs(totalKcal - kcalTarget) > kcalTarget * 0.2) {
    warnings.push({
      code: "kcalTarget",
      kcal: Math.round(totalKcal),
      target: Math.round(kcalTarget),
    });
  }
  if (reused) warnings.push({ code: "reused" });

  return { meals, warnings };
}
