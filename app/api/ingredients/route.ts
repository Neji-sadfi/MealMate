import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { escapeRegex } from "@/lib/regex";
import { Ingredient } from "@/models/Ingredient";
import { AISLES, UNITS } from "@/models/enums";

const ingredientInput = z.object({
  name: z.string().trim().min(1).max(120),
  aisle: z.enum(AISLES).default("other"),
  defaultUnit: z.enum(UNITS).default("g"),
  estimatedPrice: z.number().min(0).optional(),
  nutritionPer100: z
    .object({
      calories: z.number().min(0),
      protein: z.number().min(0),
      carbs: z.number().min(0),
      fat: z.number().min(0),
    })
    .optional(),
});

export async function GET(request: Request) {
  if (!(await getCurrentUserId()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams.get("search")?.trim().slice(0, 100);
  const filter = search ? { name: { $regex: escapeRegex(search), $options: "i" } } : {};
  const ingredients = await Ingredient.find(filter).sort({ name: 1 }).limit(200).lean();
  return NextResponse.json(ingredients);
}

export async function POST(request: Request) {
  if (!(await getCurrentUserId()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = ingredientInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid ingredient", issues: parsed.error.issues },
      { status: 400 },
    );
  try {
    const ingredient = await Ingredient.create(parsed.data);
    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "This ingredient already exists" }, { status: 409 });
    }
    throw error;
  }
}
