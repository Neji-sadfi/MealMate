import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { Favorite } from "@/models/Favorite";
import { Recipe } from "@/models/Recipe";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const favorites = await Favorite.find({ user: userId })
    .populate("recipe")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(favorites.map((favorite) => favorite.recipe).filter(Boolean));
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ recipeId: z.string().refine(Types.ObjectId.isValid) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid recipe id" }, { status: 400 });
  if (!(await Recipe.exists({ _id: parsed.data.recipeId }))) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const existing = await Favorite.findOne({ user: userId, recipe: parsed.data.recipeId });
  if (existing) {
    await existing.deleteOne();
    return NextResponse.json({ recipeId: parsed.data.recipeId, favorite: false });
  }
  await Favorite.create({ user: userId, recipe: parsed.data.recipeId });
  return NextResponse.json({ recipeId: parsed.data.recipeId, favorite: true }, { status: 201 });
}
