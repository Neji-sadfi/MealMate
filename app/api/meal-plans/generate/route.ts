import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { dailyTargets } from "@/lib/nutrition-targets";
import { Recipe } from "@/models/Recipe";
import { User } from "@/models/User";
import { generatePlanSchema } from "@/features/meal-plan/schemas";
import { generatePlan, type GeneratorRecipe } from "@/features/meal-plan/services/generator";
import {
  mealPlanErrorResponse,
  replacePlanMeals,
} from "@/features/meal-plan/services/meal-plan-service";
import { isoOfUtc, mondayUtcOf } from "@/features/meal-plan/services/plan-dates";
import { listPantryNames } from "@/features/meal-plan/services/server-providers";

// POST /api/meal-plans/generate
// { weekStart, days?, mealsPerDay?, extraBudget?, people? } -> replaces that
// week's meals, saves the criteria on the plan, sets generated: true and
// returns { plan, warnings }.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid generate payload." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const userId = session.user.id;
    const user = await User.findById(userId).lean();
    const recipes = await Recipe.find({}).lean();
    const inventoryNames = await listPantryNames(userId); // Member 4 data, try/catch inside
    const targets = dailyTargets(user);
    const weekStart = isoOfUtc(mondayUtcOf(parsed.data.weekStart));

    const { meals, warnings } = generatePlan({
      weekStart,
      recipes: recipes.map((recipe): GeneratorRecipe => ({
        id: recipe._id.toString(),
        title: recipe.title,
        imageUrl: recipe.imageUrl ?? undefined,
        calories: recipe.nutrition.calories,
        protein: recipe.nutrition.protein,
        cost: recipe.costPerServing,
        diets: [...recipe.diets],
        ingredientNames: recipe.ingredients.map((ingredient) => ingredient.name),
      })),
      preferences: {
        diet: user?.preferences?.diet ?? "none",
        // An intolerance excludes a recipe just like an allergy does.
        allergies: [
          ...(user?.preferences?.allergies ?? []),
          ...(user?.preferences?.intolerances ?? []),
        ],
        kcalTarget: targets.kcal,
        proteinTarget: targets.protein,
        weeklyBudget: user?.preferences?.weeklyBudget ?? 0,
      },
      extraBudget: parsed.data.extraBudget,
      inventoryNames,
      days: parsed.data.days,
      mealsPerDay: parsed.data.mealsPerDay,
      people: parsed.data.people,
    });

    const plan = await replacePlanMeals(
      userId,
      weekStart,
      meals.map((meal) => ({
        date: meal.date,
        type: meal.type,
        time: meal.time,
        servings: meal.servings,
        recipeId: meal.recipe.id,
      })),
      true,
      // The criteria that produced this plan are kept on the plan, so the
      // screen shows the same numbers the next time it is opened.
      {
        people: parsed.data.people,
        days: parsed.data.days,
        mealsPerDay: parsed.data.mealsPerDay,
        extraBudget: parsed.data.extraBudget,
      },
    );
    return NextResponse.json({ plan, warnings });
  } catch (error) {
    return mealPlanErrorResponse(error);
  }
}
