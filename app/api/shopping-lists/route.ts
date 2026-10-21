import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";

function currentWeekStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function getCurrentList(userId: NonNullable<Awaited<ReturnType<typeof getCurrentUserId>>>) {
  const weekStart = currentWeekStart();
  return ShoppingList.findOneAndUpdate(
    { user: userId, weekStart },
    { $setOnInsert: { estimatedTotal: 0, completed: false } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
}

const itemInput = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().min(0).optional(),
  unit: z.enum(["g", "kg", "ml", "l", "piece", "tbsp", "tsp", "bunch", "pot", "to_taste"]).default("piece"),
  aisle: z.enum(["fruits_vegetables", "fresh_protein", "dairy", "grocery", "bakery", "frozen", "drinks", "other"]).default("other"),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const list = await getCurrentList(userId);
  const items = await ShoppingItem.find({ list: list._id }).sort({ aisle: 1, createdAt: 1 }).lean();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = itemInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shopping item", issues: parsed.error.issues }, { status: 400 });
  }

  const list = await getCurrentList(userId);
  const item = await ShoppingItem.create({ ...parsed.data, list: list._id, addedManually: true });
  return NextResponse.json(item, { status: 201 });
}
