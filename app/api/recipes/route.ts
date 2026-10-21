import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { recipeInputSchema } from "@/features/recipes/schemas";
import { resolveRecipeIngredients } from "@/lib/recipe-ingredients";
import { buildRecipeFilter } from "@/lib/recipe-search";
import { Recipe } from "@/models/Recipe";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filter = buildRecipeFilter(new URL(request.url).searchParams);
  const recipes = await Recipe.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json(recipes);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const parsed = recipeInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid recipe", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const ingredients = await resolveRecipeIngredients(parsed.data.ingredients);

  const recipe = await Recipe.create({ ...parsed.data, ingredients, createdBy: userId });
  return NextResponse.json(recipe, { status: 201 });
}
