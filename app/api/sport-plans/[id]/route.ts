import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { SportPlan } from "@/models/SportPlan";
import { EQUIPMENT, SPORT_GOALS, SPORT_LEVELS, WEEKDAYS } from "@/models/enums";

type Context = { params: Promise<{ id: string }> };
const updateSchema = z.object({
  goal: z.enum(SPORT_GOALS).optional(),
  level: z.enum(SPORT_LEVELS).optional(),
  days: z.array(z.enum(WEEKDAYS)).optional(),
  sessionDurationMinutes: z.number().int().min(10).max(180).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function GET(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Sport plan not found" }, { status: 404 });
  const plan = await SportPlan.findOne({ _id: id, user: userId }).lean();
  if (!plan) return NextResponse.json({ error: "Sport plan not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Sport plan not found" }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sport plan", issues: parsed.error.issues }, { status: 400 });
  const plan = await SportPlan.findOneAndUpdate({ _id: id, user: userId }, { $set: parsed.data }, { returnDocument: "after", runValidators: true });
  if (!plan) return NextResponse.json({ error: "Sport plan not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function DELETE(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Sport plan not found" }, { status: 404 });
  const plan = await SportPlan.findOneAndUpdate({ _id: id, user: userId }, { $set: { active: false } }, { returnDocument: "after" });
  if (!plan) return NextResponse.json({ error: "Sport plan not found" }, { status: 404 });
  return NextResponse.json({ deleted: true, sportPlanId: id });
}
