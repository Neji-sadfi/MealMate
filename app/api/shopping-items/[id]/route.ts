import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";

type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({
  checked: z.boolean().optional(),
  quantity: z.number().min(0).optional(),
  name: z.string().trim().min(1).max(120).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function PUT(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid shopping item", issues: parsed.error.issues }, { status: 400 });

  const lists = await ShoppingList.find({ user: userId }).distinct("_id");
  const item = await ShoppingItem.findOneAndUpdate(
    { _id: id, list: { $in: lists } },
    { $set: parsed.data },
    { returnDocument: "after", runValidators: true },
  );
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function DELETE(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const lists = await ShoppingList.find({ user: userId }).distinct("_id");
  const item = await ShoppingItem.findOneAndDelete({ _id: id, list: { $in: lists } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ deleted: true, itemId: id });
}
