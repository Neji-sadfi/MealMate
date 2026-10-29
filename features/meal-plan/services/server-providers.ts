import { connectToDatabase } from "@/lib/db";
import { Ingredient } from "@/models/Ingredient";
import { Inventory } from "@/models/Inventory";
import { Recipe } from "@/models/Recipe";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";
import type { RecipeSnapshot } from "../types";

/**
 * Server-side providers for data the meal-plan screen needs but must never
 * load through a model import in client code (recipes = Member 2,
 * inventory + shopping = Member 4).
 * Reads of other members' collections are wrapped in try/catch with typed
 * fallbacks so their changes cannot crash my pages.
 */

export async function listRecipeSnapshots(): Promise<RecipeSnapshot[]> {
  await connectToDatabase();
  const recipes = await Recipe.find({}).sort({ title: 1 }).lean();
  return recipes.map((recipe) => ({
    id: recipe._id.toString(),
    title: recipe.title,
    imageUrl: recipe.imageUrl ?? undefined,
    calories: recipe.nutrition.calories,
    protein: recipe.nutrition.protein,
    cost: recipe.costPerServing,
  }));
}

export async function listPantryNames(userId: string): Promise<string[]> {
  try {
    await connectToDatabase();
    const stocked = await Inventory.find({ user: userId }).limit(100).lean();
    if (stocked.length === 0) return [];
    const ingredients = await Ingredient.find({ _id: { $in: stocked.map((item) => item.ingredient) } })
      .select("name")
      .lean();
    return [...new Set(ingredients.map((ingredient) => ingredient.name))].sort();
  } catch {
    return [];
  }
}

export async function pendingShoppingCount(userId: string): Promise<number> {
  try {
    await connectToDatabase();
    const list = await ShoppingList.findOne({ user: userId }).sort({ weekStart: -1 }).lean();
    if (!list) return 0;
    return await ShoppingItem.countDocuments({ list: list._id, checked: false });
  } catch {
    return 0;
  }
}
