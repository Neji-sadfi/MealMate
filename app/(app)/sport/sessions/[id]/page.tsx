import type { Metadata } from "next";
import Link from "next/link";
import { Types } from "mongoose";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { WorkoutSessionActions } from "@/features/sport/components/WorkoutSessionActions";
import { getCurrentUserId } from "@/lib/current-user";
import { WorkoutSession } from "@/models/WorkoutSession";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.workoutSession");
  return { title: t("title") };
}

export default async function WorkoutSessionPage({ params }: PageProps<"/sport/sessions/[id]">) {
  const { id } = await params;
  const t = await getTranslations("pages.workoutSession");
  const locale = await getLocale();
  const userId = await getCurrentUserId();
  const session =
    userId && Types.ObjectId.isValid(id)
      ? await WorkoutSession.findOne({ _id: id, user: userId }).lean()
      : null;

  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">{t("notFound")}</p>
        <Link href="/sport" className="text-sm font-semibold text-primary">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-muted uppercase">
          {new Date(session.scheduledAt).toLocaleDateString(locale)}
        </p>
        <h1 className="text-3xl font-black">{session.name}</h1>
        <p className="text-sm text-muted">
          {t("minutes", { count: session.durationMinutes })} · {t(`status.${session.status}`)}
        </p>
      </section>
      <WorkoutSessionActions sessionId={session._id.toString()} status={session.status} />
      {session.focus && (
        <Card>
          <p className="text-sm font-semibold">{t("focus")}</p>
          <p className="mt-1 text-muted">{session.focus}</p>
        </Card>
      )}
      {session.warmUp && (
        <Card>
          <h2 className="font-bold">
            {t("warmUp")} · {t("minutes", { count: session.warmUp.durationMinutes })}
          </h2>
          <p className="mt-1 text-sm text-muted">{session.warmUp.description}</p>
        </Card>
      )}
      <Card>
        <h2 className="mb-3 text-lg font-bold">{t("exercises")}</h2>
        <ul className="space-y-2 text-sm">
          {session.exercises.map((exercise, index) => (
            <li key={`${exercise.name}-${index}`} className="rounded-xl bg-surface p-3">
              <p className="font-semibold">{exercise.name}</p>
              <p className="mt-1 text-muted">
                {t("sets", { count: exercise.sets })}
                {exercise.repetitions ? ` · ${t("reps", { count: exercise.repetitions })}` : ""}
                {exercise.durationSeconds ? ` · ${exercise.durationSeconds}s` : ""} ·{" "}
                {t("rest", { seconds: exercise.restSeconds })}
              </p>
              {exercise.tip && <p className="mt-1 text-muted">{exercise.tip}</p>}
            </li>
          ))}
        </ul>
      </Card>
      {session.coolDown && (
        <Card>
          <h2 className="font-bold">
            {t("coolDown")} · {t("minutes", { count: session.coolDown.durationMinutes })}
          </h2>
          <p className="mt-1 text-sm text-muted">{session.coolDown.description}</p>
        </Card>
      )}
    </div>
  );
}
