import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { connectToDatabase } from "@/lib/db";
import { workoutProgramSchema } from "@/features/sport/schemas";
import { SportPlan } from "@/models/SportPlan";
import { WorkoutSession } from "@/models/WorkoutSession";

const DAY_INDEX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

function nextWeekStart() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const daysUntilNextMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilNextMonday);
  return date;
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const parsed = workoutProgramSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid workout program." }, { status: 400 });

  try {
    await connectToDatabase();
    const weekStart = nextWeekStart();
    const previousPlans = await SportPlan.find({ user: userId, active: true }).select("_id").lean();
    const plan = await SportPlan.create({
      user: userId,
      ...parsed.data.settings,
      weekStart,
      active: false,
    });

    try {
      const createdSessions = await WorkoutSession.insertMany(
        parsed.data.sessions.map((session) => ({
          sportPlan: plan._id,
          user: userId,
          name: session.name,
          focus: session.focus,
          scheduledAt: new Date(
            weekStart.getTime() + DAY_INDEX[session.day] * DAY_MS + 9 * 60 * 60 * 1000,
          ),
          durationMinutes: parsed.data.settings.sessionDurationMinutes,
          status: "planned",
          warmUp: session.warmUp,
          exercises: session.exercises,
          coolDown: session.coolDown,
        })),
      );
      if (createdSessions.length !== parsed.data.sessions.length) {
        throw new Error("Generated workout sessions were not all saved.");
      }
      await SportPlan.updateMany({ user: userId, active: true }, { $set: { active: false } });
      const activated = await SportPlan.updateOne(
        { _id: plan._id, user: userId },
        { $set: { active: true } },
      );
      if (activated.matchedCount !== 1)
        throw new Error("Generated workout plan could not be activated.");
      // The old program is replaced: its upcoming sessions must not stay on the calendar.
      await WorkoutSession.deleteMany({
        user: userId,
        status: "planned",
        scheduledAt: { $gte: new Date() },
        sportPlan: { $in: previousPlans.map((previous) => previous._id) },
      }).catch((error) => console.error("could not remove the old planned sessions", error));
      return NextResponse.json(
        { planId: plan._id.toString(), sessionCount: createdSessions.length },
        { status: 201 },
      );
    } catch (error) {
      try {
        await WorkoutSession.deleteMany({ sportPlan: plan._id, user: userId });
        await SportPlan.deleteOne({ _id: plan._id, user: userId });
      } catch (cleanupError) {
        console.error("could not clean up incomplete workout program", cleanupError);
      }
      try {
        if (previousPlans.length > 0) {
          await SportPlan.updateMany(
            { _id: { $in: previousPlans.map((previous) => previous._id) }, user: userId },
            { $set: { active: true } },
          );
        }
      } catch (restoreError) {
        console.error("could not restore the previous active workout plan", restoreError);
      }
      throw error;
    }
  } catch (error) {
    console.error("could not save generated workout program", error);
    return NextResponse.json({ error: "Could not save this workout program." }, { status: 500 });
  }
}
