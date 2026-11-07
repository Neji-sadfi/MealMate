import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/current-user";
import { WorkoutCreateForm } from "@/features/sport/components/WorkoutCreateForm";
import { WorkoutProgramGenerator } from "@/features/sport/components/WorkoutProgramGenerator";
import type { WorkoutSettings } from "@/features/sport/schemas";
import { SportPlan } from "@/models/SportPlan";
import { User } from "@/models/User";
import { WorkoutSession } from "@/models/WorkoutSession";
import { PhotoHero } from "@/components/ui/PhotoHero";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.sport");
  return { title: t("title") };
}

export default async function SportPage() {
  const t = await getTranslations("pages.sport");
  const tSession = await getTranslations("pages.workoutSession");
  const locale = await getLocale();
  const userId = await getCurrentUserId();
  const user = userId ? await User.findById(userId).select("preferences").lean() : null;
  const preferences = user?.preferences;
  const initialSettings: WorkoutSettings = {
    goal: preferences?.sportGoal ?? "fitness",
    level: preferences?.level ?? "beginner",
    days: preferences?.availableDays.length
      ? [...preferences.availableDays]
      : ["mon", "wed", "fri"],
    sessionDurationMinutes: preferences?.sessionDurationMinutes ?? 45,
    equipment: preferences?.equipment ?? "none",
  };
  const plan = userId
    ? await SportPlan.findOne({ user: userId, active: true }).sort({ weekStart: -1 }).lean()
    : null;
  const sessions = plan
    ? await WorkoutSession.find({ user: userId, sportPlan: plan._id })
        .sort({ scheduledAt: 1 })
        .lean()
    : [];

  return (
    <div className="flex flex-col gap-4">
      <PhotoHero image="sport" title={t("title")} subtitle={t("subtitle")} />
      <WorkoutProgramGenerator initialSettings={initialSettings} />
      <WorkoutCreateForm />
      {sessions.length === 0 ? (
        <Card>
          <h2 className="font-bold">{t("empty.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("empty.body")}</p>
        </Card>
      ) : (
        sessions.map((session) => (
          <Link
            key={session._id.toString()}
            href={`/sport/sessions/${session._id.toString()}`}
            className="block"
          >
            <Card className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">{session.name}</h2>
                <span className="text-xs text-muted">{tSession(`status.${session.status}`)}</span>
              </div>
              <p className="text-sm text-muted">
                {tSession("minutes", { count: session.durationMinutes })} ·{" "}
                {new Date(session.scheduledAt).toLocaleDateString(locale)}
              </p>
              {session.focus && <p className="text-sm text-muted">{session.focus}</p>}
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
