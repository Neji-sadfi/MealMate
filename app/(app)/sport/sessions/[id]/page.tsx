import type { Metadata } from "next";
import Link from "next/link";
import { Types } from "mongoose";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/current-user";
import { WorkoutSession } from "@/models/WorkoutSession";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.workoutSession");
  return { title: t("title") };
}

export default async function WorkoutSessionPage({ params }: PageProps<"/sport/sessions/[id]">) {
  const { id } = await params;
  const t = await getTranslations("pages.workoutSession");
  const userId = await getCurrentUserId();
  const session =
    userId && Types.ObjectId.isValid(id)
      ? await WorkoutSession.findOne({ _id: id, user: userId }).lean()
      : null;

  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">Session not found.</p>
        <Link href="/sport" className="text-sm font-semibold text-primary">
          Back to sport
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-muted uppercase">
          {new Date(session.scheduledAt).toLocaleDateString()}
        </p>
        <h1 className="text-3xl font-black">{session.name}</h1>
        <p className="text-sm text-muted">
          {session.durationMinutes} minutes · {session.status}
        </p>
      </section>
      {session.focus && (
        <Card>
          <p className="text-sm font-semibold">Focus</p>
          <p className="mt-1 text-muted">{session.focus}</p>
        </Card>
      )}
      {session.warmUp && (
        <Card>
          <h2 className="font-bold">Warm-up · {session.warmUp.durationMinutes} minutes</h2>
          <p className="mt-1 text-sm text-muted">{session.warmUp.description}</p>
        </Card>
      )}
      <Card>
        <h2 className="mb-3 text-lg font-bold">Exercises</h2>
        <ul className="space-y-2 text-sm">
          {session.exercises.map((exercise, index) => (
            <li key={`${exercise.name}-${index}`} className="rounded-xl bg-surface p-3">
              <p className="font-semibold">{exercise.name}</p>
              <p className="mt-1 text-muted">
                {exercise.sets} sets{exercise.repetitions ? ` · ${exercise.repetitions} reps` : ""}
                {exercise.durationSeconds ? ` · ${exercise.durationSeconds}s` : ""} ·{" "}
                {exercise.restSeconds}s rest
              </p>
              {exercise.tip && <p className="mt-1 text-muted">{exercise.tip}</p>}
            </li>
          ))}
        </ul>
      </Card>
      {session.coolDown && (
        <Card>
          <h2 className="font-bold">Cool-down · {session.coolDown.durationMinutes} minutes</h2>
          <p className="mt-1 text-sm text-muted">{session.coolDown.description}</p>
        </Card>
      )}
    </div>
  );
}
