import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { Meal } from "@/models/Meal";
import { Ingredient } from "@/models/Ingredient";
import { Inventory } from "@/models/Inventory";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";
import type { Unit } from "@/models/enums";

function currentWeek() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
}

type RecipeIngredient = {
  ingredient: { _id: unknown } | unknown;
  name: string;
  quantity?: number;
  unit: Unit;
};

const unitScale: Partial<Record<Unit, { family: "weight" | "volume"; factor: number }>> = {
  g: { family: "weight", factor: 1 },
  kg: { family: "weight", factor: 1000 },
  ml: { family: "volume", factor: 1 },
  l: { family: "volume", factor: 1000 },
};

function convertQuantity(quantity: number, from: Unit, to: Unit): number {
  if (from === to) return quantity;
  const source = unitScale[from];
  const target = unitScale[to];
  return source && target && source.family === target.family
    ? (quantity * source.factor) / target.factor
    : 0;
}

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const week = currentWeek();
  const meals = await Meal.find({ user: userId, date: { $gte: week.start, $lte: week.end } })
    .populate("recipe", "ingredients servings")
    .lean();
  if (meals.length === 0)
    return NextResponse.json({ error: "Add meals to your plan first" }, { status: 409 });

  const ingredients = new Map<
    string,
    { ingredientId: string; name: string; quantity: number; unit: Unit }
  >();
  for (const meal of meals) {
    const recipe = meal.recipe as unknown as {
      ingredients: RecipeIngredient[];
      servings?: number;
    } | null;
    // The quantities of a recipe are written for recipe.servings portions.
    const scale = meal.servings / Math.max(1, recipe?.servings ?? 1);
    for (const entry of recipe?.ingredients ?? []) {
      if (entry.quantity === undefined) continue;
      const ingredientId = String((entry.ingredient as { _id?: unknown })?._id ?? entry.ingredient);
      const key = `${ingredientId}:${entry.unit}`;
      const existing = ingredients.get(key);
      if (existing) existing.quantity += entry.quantity * scale;
      else
        ingredients.set(key, {
          ingredientId,
          name: entry.name,
          quantity: entry.quantity * scale,
          unit: entry.unit,
        });
    }
  }
  const ingredientRows = await Ingredient.find({
    _id: { $in: [...ingredients.values()].map((entry) => entry.ingredientId) },
  })
    .select("_id aisle estimatedPrice")
    .lean();
  const aisleById = new Map(ingredientRows.map((item) => [item._id.toString(), item.aisle]));
  const priceById = new Map(
    ingredientRows.map((item) => [item._id.toString(), item.estimatedPrice]),
  );
  const inventoryRows = await Inventory.find({
    user: userId,
    ingredient: { $in: ingredientRows.map((item) => item._id) },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ],
  })
    .select("ingredient quantity unit")
    .lean();
  const inventoryByIngredient = new Map<string, { quantity: number; unit: Unit }[]>();
  for (const stock of inventoryRows) {
    const key = stock.ingredient.toString();
    const existing = inventoryByIngredient.get(key) ?? [];
    existing.push({ quantity: stock.quantity, unit: stock.unit });
    inventoryByIngredient.set(key, existing);
  }
  const list = await ShoppingList.findOneAndUpdate(
    { user: userId, weekStart: week.start },
    {
      $set: { lastSyncedAt: new Date() },
      $setOnInsert: { estimatedTotal: 0, completed: false },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  await ShoppingItem.deleteMany({ list: list._id, addedManually: false });
  const newItems = [...ingredients.values()]
    .map((item) => {
      const available = (inventoryByIngredient.get(item.ingredientId) ?? []).reduce(
        (sum, stock) => sum + convertQuantity(stock.quantity, stock.unit, item.unit),
        0,
      );
      return { ...item, quantity: Math.max(0, item.quantity - available) };
    })
    .filter((item) => item.quantity > 1e-8)
    .map((item) => ({
      list: list._id,
      ingredient: item.ingredientId,
      name: item.name,
      quantity: Math.round(item.quantity * 100) / 100,
      unit: item.unit,
      aisle: aisleById.get(item.ingredientId) ?? "other",
      estimatedPrice: priceById.get(item.ingredientId),
      checked: false,
      addedManually: false,
    }));
  if (newItems.length) await ShoppingItem.insertMany(newItems);
  const items = await ShoppingItem.find({ list: list._id }).sort({ aisle: 1, name: 1 }).lean();
  return NextResponse.json({ list, items }, { status: 201 });
}
