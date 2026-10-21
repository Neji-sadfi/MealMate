"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { formatDayHeading } from "../services/format";
import type { DashboardData } from "../types";
import { ExpiryAlertBanner } from "./ExpiryAlertBanner";
import { HomeBudgetCard } from "./HomeBudgetCard";
import { HomeShortcuts } from "./HomeShortcuts";
import { HomeStatCards } from "./HomeStatCards";
import { NextWorkoutRow } from "./NextWorkoutRow";
import { ShoppingPreviewCard } from "./ShoppingPreviewCard";
import { TodayMenuCard } from "./TodayMenuCard";

type HomeScreenProps = {
  firstName: string;
  todayISO: string;
  /** Phase B: mock data. Phase E only swaps the source on the server page. */
  data: DashboardData;
};

export function HomeScreen({ firstName, todayISO, data }: HomeScreenProps) {
  const t = useTranslations("pages.home");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t("kicker")}</p>
        <h1 className="text-2xl leading-tight font-extrabold">{t("title", { name: firstName })}</h1>
        <p className="text-sm text-muted">{formatDayHeading(todayISO, locale)}</p>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </section>

      <HomeBudgetCard budget={data.budget} />
      <HomeStatCards stats={data.stats} />
      <TodayMenuCard meals={data.todayMeals} />
      <ShoppingPreviewCard shopping={data.shopping} />
      <ExpiryAlertBanner expiry={data.nearestExpiry} todayISO={todayISO} />
      <NextWorkoutRow workout={data.nextWorkout} />
      <HomeShortcuts />

      <Link
        href="/tracking"
        className="inline-flex h-12 w-full items-center justify-center rounded-full border border-primary px-5 text-center font-semibold text-primary"
      >
        {t("trackingLink")}
      </Link>
    </div>
  );
}
