import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { Ingredient } from "@/models/Ingredient";
import { Inventory } from "@/models/Inventory";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";

type Context = { params: Promise<{ id: string }> };
const updateSchema = z
  .object({
    checked: z.boolean().optional(),
    quantity: z.number().min(0).optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export async function PUT(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid shopping item", issues: parsed.error.issues },
      { status: 400 },
    );

  const lists = await ShoppingList.find({ user: userId }).distinct("_id");
  if (typeof parsed.data.checked === "boolean") {
    const currentItem = await ShoppingItem.findOne({ _id: id, list: { $in: lists } });
    if (!currentItem) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    if (parsed.data.checked && !currentItem.checked) {
      let ingredientId = currentItem.ingredient;
      if (!ingredientId) {
        const escapedName = currentItem.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        let ingredient = await Ingredient.findOne({
          name: { $regex: `^${escapedName}$`, $options: "i" },
        });
        if (!ingredient) {
          try {
            ingredient = await Ingredient.create({
              name: currentItem.name,
              aisle: currentItem.aisle,
              defaultUnit: currentItem.unit,
              estimatedPrice: currentItem.estimatedPrice,
            });
          } catch (error) {
            if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) {
              throw error;
            }
            ingredient = await Ingredient.findOne({
              name: { $regex: `^${escapedName}$`, $options: "i" },
            });
            if (!ingredient) throw error;
          }
        }
        ingredientId = ingredient._id;
      }

      const purchasedQuantity = parsed.data.quantity ?? currentItem.quantity ?? 1;
      const claimed = await ShoppingItem.findOneAndUpdate(
        {
          _id: id,
          list: { $in: lists },
          checked: false,
          inventorySynced: { $ne: true },
        },
        {
          $set: {
            checked: true,
            inventorySynced: true,
            inventoryQuantity: purchasedQuantity,
            ingredient: ingredientId,
            ...(parsed.data.quantity === undefined ? {} : { quantity: parsed.data.quantity }),
          },
        },
        { returnDocument: "after" },
      );
      if (!claimed) {
        const latest = await ShoppingItem.findOne({ _id: id, list: { $in: lists } });
        return NextResponse.json(latest ?? { error: "Item not found" }, {
          status: latest ? 200 : 404,
        });
      }

      try {
        await Inventory.findOneAndUpdate(
          { user: userId, ingredient: ingredientId, unit: currentItem.unit },
          {
            $inc: { quantity: purchasedQuantity },
            $setOnInsert: { user: userId, ingredient: ingredientId, unit: currentItem.unit },
          },
          {
            upsert: true,
            returnDocument: "after",
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        );
      } catch (error) {
        await ShoppingItem.updateOne(
          { _id: id, inventorySynced: true },
          { $set: { checked: false, inventorySynced: false }, $unset: { inventoryQuantity: 1 } },
        );
        throw error;
      }
      return NextResponse.json(claimed);
    }

    if (!parsed.data.checked && currentItem.checked && currentItem.inventorySynced) {
      const purchasedQuantity = currentItem.inventoryQuantity ?? currentItem.quantity ?? 1;
      const unclaimed = await ShoppingItem.findOneAndUpdate(
        { _id: id, list: { $in: lists }, checked: true, inventorySynced: true },
        {
          $set: { checked: false, inventorySynced: false },
          $unset: { inventoryQuantity: 1 },
        },
        { returnDocument: "after" },
      );
      if (!unclaimed)
        return NextResponse.json({ error: "Item changed; refresh and retry." }, { status: 409 });

      try {
        const inventory = await Inventory.findOneAndUpdate(
          { user: userId, ingredient: currentItem.ingredient, unit: currentItem.unit },
          [
            {
              $set: {
                quantity: {
                  $max: [0, { $subtract: ["$quantity", purchasedQuantity] }],
                },
              },
            },
          ],
          { returnDocument: "after" },
        );
        if (inventory?.quantity === 0) await Inventory.deleteOne({ _id: inventory._id });
      } catch (error) {
        await ShoppingItem.updateOne(
          { _id: id, inventorySynced: false, checked: false },
          {
            $set: {
              checked: true,
              inventorySynced: true,
              inventoryQuantity: purchasedQuantity,
            },
          },
        );
        throw error;
      }
      return NextResponse.json(unclaimed);
    }

    const sameState = await ShoppingItem.findOneAndUpdate(
      { _id: id, list: { $in: lists } },
      { $set: parsed.data },
      { returnDocument: "after", runValidators: true },
    );
    return sameState
      ? NextResponse.json(sameState)
      : NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

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
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const lists = await ShoppingList.find({ user: userId }).distinct("_id");
  const item = await ShoppingItem.findOneAndDelete({ _id: id, list: { $in: lists } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ deleted: true, itemId: id });
}
