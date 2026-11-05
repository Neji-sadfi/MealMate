import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { WorkoutSession } from "@/models/WorkoutSession";

type Context = { params: Promise<{ id: string }> };
const phaseSchema = z.object({
  durationMinutes: z.number().int().min(0).max(30),
  description: z.string().trim().min(1).max(500),
});
const exerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    sets: z.number().int().min(1).max(100),
    repetitions: z.number().int().min(1).optional(),
    durationSeconds: z.number().int().min(1).optional(),
    restSeconds: z.number().int().min(0).default(60),
    tip: z.string().max(500).optional(),
  })
  .refine(
    (exercise) => (exercise.repetitions !== undefined) !== (exercise.durationSeconds !== undefined),
    { message: "An exercise needs either repetitions or a duration." },
  );
const updateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    focus: z.string().trim().max(200).optional(),
    scheduledAt: z.coerce.date().optional(),
    durationMinutes: z.number().int().min(1).max(300).optional(),
    status: z.enum(["planned", "done", "skipped"]).optional(),
    warmUp: phaseSchema.nullable().optional(),
    exercises: z.array(exerciseSchema).optional(),
    coolDown: phaseSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export async function GET(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Workout session not found" }, { status: 404 });
  const session = await WorkoutSession.findOne({ _id: id, user: userId }).lean();
  if (!session) return NextResponse.json({ error: "Workout session not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PUT(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Workout session not found" }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid workout session", issues: parsed.error.issues },
      { status: 400 },
    );
  const update = {
    ...parsed.data,
    ...(parsed.data.status === "done" ? { completedAt: new Date() } : {}),
  };
  const session = await WorkoutSession.findOneAndUpdate(
    { _id: id, user: userId },
    {
      $set: update,
      ...(parsed.data.status && parsed.data.status !== "done"
        ? { $unset: { completedAt: 1 } }
        : {}),
    },
    { returnDocument: "after", runValidators: true },
  );
  if (!session) return NextResponse.json({ error: "Workout session not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function DELETE(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Workout session not found" }, { status: 404 });
  const session = await WorkoutSession.findOneAndDelete({ _id: id, user: userId });
  if (!session) return NextResponse.json({ error: "Workout session not found" }, { status: 404 });
  return NextResponse.json({ deleted: true, workoutSessionId: id });
}
