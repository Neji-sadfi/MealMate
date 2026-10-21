import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentUserId } from "@/lib/current-user";
import { Favorite } from "@/models/Favorite";

export async function DELETE(_: Request, { params }: { params: Promise<{ recipeId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { recipeId } = await params;
  if (!Types.ObjectId.isValid(recipeId)) return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
  const result = await Favorite.findOneAndDelete({ user: userId, recipe: recipeId });
  if (!result) return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
  return NextResponse.json({ deleted: true, recipeId });
}
