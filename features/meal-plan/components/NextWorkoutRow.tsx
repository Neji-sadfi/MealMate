"use client";

import { Dumbbell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { formatDayMonth } from "../services/format";
import type { DashboardWorkout } from "../types";

type NextWorkoutRowProps = {
  workout: DashboardWorkout;
};

export function NextWorkoutRow({ workout }: NextWorkoutRowProps) {
  const t = useTranslations("pages.home.workout");
  const locale = useLocale();
  if (!workout) return null;

  return (
    <Card tone="tint" className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t("title")}</p>
        <p className="text-sm font-bold">
          {t("line", { name: workout.name, duration: workout.durationMinutes })}
        </p>
        <p className="text-xs text-muted">{formatDayMonth(workout.scheduledAt.slice(0, 10), locale)}</p>
      </div>
      <Dumbbell aria-hidden className="size-5 shrink-0 text-primary" />
    </Card>
  );
}
