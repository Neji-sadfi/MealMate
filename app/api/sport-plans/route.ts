import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { SportPlan } from "@/models/SportPlan";
import { EQUIPMENT, SPORT_GOALS, SPORT_LEVELS, WEEKDAYS } from "@/models/enums";
import { User } from "@/models/User";

function weekStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

const planInput = z.object({
  goal: z.enum(SPORT_GOALS).optional(),
  level: z.enum(SPORT_LEVELS).optional(),
  days: z.array(z.enum(WEEKDAYS)).optional(),
  sessionDurationMinutes: z.number().int().min(10).max(180).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const plans = await SportPlan.find({ user: userId }).sort({ weekStart: -1 }).lean();
  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = planInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid sport plan", issues: parsed.error.issues }, { status: 400 });
  const user = await User.findById(userId).select("preferences").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await SportPlan.updateMany({ user: userId, active: true }, { $set: { active: false } });
  const plan = await SportPlan.create({
    user: userId,
    weekStart: weekStart(),
    goal: parsed.data.goal ?? user.preferences.sportGoal,
    level: parsed.data.level ?? user.preferences.level,
    days: parsed.data.days ?? user.preferences.availableDays,
    sessionDurationMinutes: parsed.data.sessionDurationMinutes ?? user.preferences.sessionDurationMinutes,
    equipment: parsed.data.equipment ?? user.preferences.equipment,
  });
  return NextResponse.json(plan, { status: 201 });
}
