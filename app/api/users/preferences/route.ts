import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { User } from "@/models/User";
import { ACTIVITY_LEVELS, DIETS, EQUIPMENT, NUTRITION_GOALS, SPORT_GOALS, SPORT_LEVELS, WEEKDAYS } from "@/models/enums";

const preferencesUpdate = z.object({
  diet: z.enum(DIETS).optional(),
  allergies: z.array(z.string().trim().min(1).max(80)).optional(),
  intolerances: z.array(z.string().trim().min(1).max(80)).optional(),
  goal: z.enum(NUTRITION_GOALS).optional(),
  activityLevel: z.enum(ACTIVITY_LEVELS).optional(),
  weeklyBudget: z.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  dailyCaloriesTarget: z.number().min(0).optional(),
  dailyProteinTarget: z.number().min(0).optional(),
  sportGoal: z.enum(SPORT_GOALS).optional(),
  level: z.enum(SPORT_LEVELS).optional(),
  availableDays: z.array(z.enum(WEEKDAYS)).optional(),
  sessionDurationMinutes: z.number().int().min(10).max(180).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await User.findById(userId).select("preferences").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user.preferences);
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = preferencesUpdate.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid preferences", issues: parsed.error.issues }, { status: 400 });
  const set = Object.fromEntries(Object.entries(parsed.data).map(([key, value]) => [`preferences.${key}`, value]));
  const user = await User.findByIdAndUpdate(userId, { $set: set }, { returnDocument: "after", runValidators: true }).select("preferences");
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json(user.preferences);
}
