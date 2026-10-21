import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { Meal } from "@/models/Meal";
import { MealPlan } from "@/models/MealPlan";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  const plan = await MealPlan.findOne({ _id: id, user: userId }).lean();
  if (!plan) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  const meals = await Meal.find({ mealPlan: plan._id }).populate("recipe").sort({ date: 1, type: 1 }).lean();
  return NextResponse.json({ plan, meals });
}

export async function PUT(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  const parsed = z.object({ people: z.number().int().min(1).max(20).optional(), budget: z.number().min(0).optional() })
    .refine((value) => Object.keys(value).length > 0)
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid meal plan", issues: parsed.error.issues }, { status: 400 });
  const plan = await MealPlan.findOneAndUpdate({ _id: id, user: userId }, { $set: parsed.data }, { returnDocument: "after", runValidators: true });
  if (!plan) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function DELETE(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  const linkedLists = await ShoppingList.find({ user: userId, mealPlan: id }).select("_id").lean();
  const deleted = await MealPlan.findOneAndDelete({ _id: id, user: userId });
  if (!deleted) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  await Promise.all([
    Meal.deleteMany({ mealPlan: deleted._id, user: userId }),
    ShoppingList.deleteMany({ user: userId, mealPlan: deleted._id }),
    ShoppingItem.deleteMany({ list: { $in: linkedLists.map((list) => list._id) } }),
  ]);
  return NextResponse.json({ deleted: true, mealPlanId: id });
}
