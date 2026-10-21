import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { Favorite } from "@/models/Favorite";
import { Meal } from "@/models/Meal";
import { Recipe } from "@/models/Recipe";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";
import { User } from "@/models/User";
import { WorkoutSession } from "@/models/WorkoutSession";

function currentWeekStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, totalRecipes, favorites, list, nextWorkout] = await Promise.all([
    User.findById(userId).select("name preferences.weeklyBudget preferences.currency").lean(),
    Recipe.countDocuments(),
    Favorite.countDocuments({ user: userId }),
    ShoppingList.findOne({ user: userId, weekStart: currentWeekStart() }).select("_id").lean(),
    WorkoutSession.findOne({ user: userId, status: "planned", scheduledAt: { $gte: new Date() } }).sort({ scheduledAt: 1 }).lean(),
  ]);
  const [shoppingCount, meals] = await Promise.all([
    list ? ShoppingItem.countDocuments({ list: list._id, checked: false }) : 0,
    Meal.find({ user: userId, date: { $gte: currentWeekStart() } })
      .populate("recipe", "title")
      .sort({ date: 1, type: 1 })
      .limit(10)
      .lean(),
  ]);
  return NextResponse.json({
    name: user?.name ?? "",
    totalRecipes,
    favorites,
    shoppingCount,
    weeklyBudget: user?.preferences.weeklyBudget ?? 0,
    currency: user?.preferences.currency ?? "TND",
    meals,
    nextWorkout,
  });
}
