import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { recipeInputSchema } from "@/features/recipes/schemas";
import { getCurrentAdminId } from "@/lib/admin";
import { getCurrentUserId } from "@/lib/current-user";
import { resolveRecipeIngredients } from "@/lib/recipe-ingredients";
import { Recipe } from "@/models/Recipe";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  if (!(await getCurrentUserId()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const recipe = await Recipe.findById(id).lean();
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const parsed = recipeInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid recipe", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const adminId = await getCurrentAdminId();
  const filter = adminId ? { _id: id } : { _id: id, createdBy: userId };
  const ingredients = await resolveRecipeIngredients(parsed.data.ingredients);
  const recipe = await Recipe.findOneAndUpdate(
    filter,
    { $set: { ...parsed.data, ingredients } },
    { returnDocument: "after", runValidators: true },
  );
  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found or not owned by you" }, { status: 404 });
  }
  return NextResponse.json(recipe);
}

export async function DELETE(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  const adminId = await getCurrentAdminId();
  const filter = adminId ? { _id: id } : { _id: id, createdBy: userId };
  const recipe = await Recipe.findOneAndDelete(filter);
  if (!recipe)
    return NextResponse.json({ error: "Recipe not found or not owned by you" }, { status: 404 });
  return NextResponse.json({ deleted: true, recipeId: id });
}
