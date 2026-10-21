import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { SportPlan } from "@/models/SportPlan";
import { User } from "@/models/User";
import { WorkoutSession } from "@/models/WorkoutSession";

function weekStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().min(1).max(100),
  repetitions: z.number().int().min(1).optional(),
  durationSeconds: z.number().int().min(1).optional(),
  restSeconds: z.number().int().min(0).default(60),
  tip: z.string().max(500).optional(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await WorkoutSession.find({ user: userId }).sort({ scheduledAt: 1 }).lean();
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    focus: z.string().trim().max(200).optional(),
    scheduledAt: z.coerce.date(),
    durationMinutes: z.number().int().min(1).max(300),
    exercises: z.array(exerciseSchema).default([]),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid workout session", issues: parsed.error.issues }, { status: 400 });

  const user = await User.findById(userId).select("preferences").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  let plan = await SportPlan.findOne({ user: userId, active: true }).sort({ weekStart: -1 });
  if (!plan) {
    plan = await SportPlan.create({
      user: userId,
      goal: user.preferences.sportGoal,
      level: user.preferences.level,
      days: user.preferences.availableDays,
      sessionDurationMinutes: user.preferences.sessionDurationMinutes,
      equipment: user.preferences.equipment,
      weekStart: weekStart(),
    });
  }
  const session = await WorkoutSession.create({
    ...parsed.data,
    user: userId,
    sportPlan: plan._id,
  });
  return NextResponse.json(session, { status: 201 });
}
