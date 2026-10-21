import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { Ingredient } from "@/models/Ingredient";
import { AISLES, UNITS } from "@/models/enums";

type Context = { params: Promise<{ id: string }> };
const inputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  aisle: z.enum(AISLES).optional(),
  defaultUnit: z.enum(UNITS).optional(),
  estimatedPrice: z.number().min(0).optional(),
  nutritionPer100: z.object({
    calories: z.number().min(0),
    protein: z.number().min(0),
    carbs: z.number().min(0),
    fat: z.number().min(0),
  }).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function GET(_: Request, { params }: Context) {
  if (!(await getCurrentUserId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  const ingredient = await Ingredient.findById(id).lean();
  if (!ingredient) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  return NextResponse.json(ingredient);
}

export async function PUT(request: Request, { params }: Context) {
  if (!(await getCurrentUserId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid ingredient", issues: parsed.error.issues }, { status: 400 });
  const ingredient = await Ingredient.findByIdAndUpdate(id, { $set: parsed.data }, { returnDocument: "after", runValidators: true });
  if (!ingredient) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  return NextResponse.json(ingredient);
}

export async function DELETE(_: Request, { params }: Context) {
  if (!(await getCurrentUserId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  const ingredient = await Ingredient.findByIdAndDelete(id);
  if (!ingredient) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
  return NextResponse.json({ deleted: true, ingredientId: id });
}
