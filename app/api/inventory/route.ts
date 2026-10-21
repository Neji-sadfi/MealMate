import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { Ingredient } from "@/models/Ingredient";
import { Inventory } from "@/models/Inventory";

const units = ["g", "kg", "ml", "l", "piece", "tbsp", "tsp", "bunch", "pot", "to_taste"] as const;
const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().min(0),
  unit: z.enum(units),
  expiresAt: z.coerce.date().optional(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await Inventory.find({ user: userId })
    .populate("ingredient", "name aisle")
    .sort({ expiresAt: 1, updatedAt: -1 })
    .lean();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid inventory item", issues: parsed.error.issues }, { status: 400 });

  const ingredient = await Ingredient.findOneAndUpdate(
    { name: { $regex: `^${parsed.data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
    { $setOnInsert: { name: parsed.data.name, aisle: "other", defaultUnit: parsed.data.unit } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  const item = await Inventory.findOneAndUpdate(
    { user: userId, ingredient: ingredient._id, unit: parsed.data.unit },
    {
      $inc: { quantity: parsed.data.quantity },
      $set: parsed.data.expiresAt ? { expiresAt: parsed.data.expiresAt } : {},
      $setOnInsert: { user: userId, ingredient: ingredient._id, unit: parsed.data.unit },
    },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
  return NextResponse.json(item, { status: 201 });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string(), quantity: z.number().min(0) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid inventory update", issues: parsed.error.issues }, { status: 400 });

  const item = await Inventory.findOneAndUpdate(
    { _id: parsed.data.id, user: userId },
    { $set: { quantity: parsed.data.quantity } },
    { returnDocument: "after", runValidators: true },
  ).populate("ingredient", "name aisle");
  if (!item) return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid inventory item id" }, { status: 400 });
  const item = await Inventory.findOneAndDelete({ _id: parsed.data.id, user: userId });
  if (!item) return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
  return NextResponse.json({ deleted: true, itemId: parsed.data.id });
}
