import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/current-user";
import { WorkoutCreateForm } from "@/features/sport/components/WorkoutCreateForm";
import { SportPlan } from "@/models/SportPlan";
import { WorkoutSession } from "@/models/WorkoutSession";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.sport");
  return { title: t("title") };
}

export default async function SportPage() {
  const t = await getTranslations("pages.sport");
  const userId = await getCurrentUserId();
  const plan = userId ? await SportPlan.findOne({ user: userId, active: true }).sort({ weekStart: -1 }).lean() : null;
  const sessions = plan
    ? await WorkoutSession.find({ user: userId, sportPlan: plan._id }).sort({ scheduledAt: 1 }).lean()
    : [];

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1"><h1 className="text-2xl font-black">{t("title")}</h1><p className="text-sm text-muted">{t("subtitle")}</p></section>
      <WorkoutCreateForm />
      {sessions.length === 0 ? (
        <Card><h2 className="font-bold">No workout sessions scheduled</h2><p className="mt-1 text-sm text-muted">Create a sport plan to see sessions saved to your account.</p></Card>
      ) : sessions.map((session) => (
        <Link key={session._id.toString()} href={`/sport/sessions/${session._id.toString()}`} className="block">
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{session.name}</h2><span className="text-xs capitalize text-muted">{session.status}</span></div>
            <p className="text-sm text-muted">{session.durationMinutes} minutes · {new Date(session.scheduledAt).toLocaleDateString()}</p>
            {session.focus && <p className="text-sm text-muted">{session.focus}</p>}
          </Card>
        </Link>
      ))}
    </div>
  );
}
