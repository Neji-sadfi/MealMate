"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PhotoHero } from "@/components/ui/PhotoHero";
import { formatDayHeading } from "../services/format";
import type { DashboardData } from "../types";
import { ExpiryAlertBanner } from "./ExpiryAlertBanner";
import { HomeBudgetCard } from "./HomeBudgetCard";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PhotoHero
        image="home"
        kicker={t("kicker")}
        title={t("title", { name: firstName })}
        subtitle={t("subtitle")}
        meta={formatDayHeading(todayISO, locale)}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <HomeBudgetCard budget={data.budget} />
        <HomeStatCards stats={data.stats} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TodayMenuCard meals={data.todayMeals} />
        <div className="flex flex-col gap-4">
          <ShoppingPreviewCard shopping={data.shopping} />
          <ExpiryAlertBanner expiry={data.nearestExpiry} todayISO={todayISO} />
          <NextWorkoutRow workout={data.nextWorkout} />
        </div>
      </div>
      <Link
        href="/tracking"
        className="inline-flex h-12 w-full items-center justify-center rounded-full border border-primary px-5 text-center font-semibold text-primary"
      >
        {t("trackingLink")}
      </Link>
    </div>
  );
}
