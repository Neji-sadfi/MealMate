import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { Meal } from "@/models/Meal";
import { Ingredient } from "@/models/Ingredient";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";

function currentWeek() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
}

type RecipeIngredient = { ingredient: { _id: unknown } | unknown; name: string; quantity?: number; unit: string };

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const week = currentWeek();
  const meals = await Meal.find({ user: userId, date: { $gte: week.start, $lte: week.end } })
    .populate("recipe", "ingredients")
    .lean();
  if (meals.length === 0) return NextResponse.json({ error: "Add meals to your plan first" }, { status: 409 });

  const ingredients = new Map<string, { ingredientId: string; name: string; quantity: number; unit: string }>();
  for (const meal of meals) {
    const recipe = meal.recipe as unknown as { ingredients: RecipeIngredient[] } | null;
    for (const entry of recipe?.ingredients ?? []) {
      if (entry.quantity === undefined) continue;
      const ingredientId = String((entry.ingredient as { _id?: unknown })?._id ?? entry.ingredient);
      const key = `${ingredientId}:${entry.unit}`;
      const existing = ingredients.get(key);
      if (existing) existing.quantity += entry.quantity * meal.servings;
      else ingredients.set(key, { ingredientId, name: entry.name, quantity: entry.quantity * meal.servings, unit: entry.unit });
    }
  }
  const ingredientRows = await Ingredient.find({ _id: { $in: [...ingredients.values()].map((entry) => entry.ingredientId) } })
    .select("_id aisle")
    .lean();
  const aisleById = new Map(ingredientRows.map((item) => [item._id.toString(), item.aisle]));
  const list = await ShoppingList.findOneAndUpdate(
    { user: userId, weekStart: week.start },
    { $set: { lastSyncedAt: new Date() }, $setOnInsert: { estimatedTotal: 0, completed: false, weekEnd: week.end } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  await ShoppingItem.deleteMany({ list: list._id, addedManually: false });
  const newItems = [...ingredients.values()].map((item) => ({
    list: list._id,
    ingredient: item.ingredientId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    aisle: aisleById.get(item.ingredientId) ?? "other",
    checked: false,
    addedManually: false,
  }));
  if (newItems.length) await ShoppingItem.insertMany(newItems);
  const items = await ShoppingItem.find({ list: list._id }).sort({ aisle: 1, name: 1 }).lean();
  return NextResponse.json({ list, items }, { status: 201 });
}
