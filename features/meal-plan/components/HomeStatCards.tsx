"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import type { DashboardStats } from "../types";

type HomeStatCardsProps = {
  stats: DashboardStats;
};

export function HomeStatCards({ stats }: HomeStatCardsProps) {
  const t = useTranslations("pages.home.stats");

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card tone="tint" className="flex flex-col gap-1">
        <p className="text-lg font-extrabold">{t("avgKcal", { kcal: stats.avgKcal })}</p>
        <p className="text-xs text-muted">{t("kcalTarget", { kcal: stats.kcalTarget })}</p>
      </Card>
      <Card tone="tint" className="flex flex-col gap-1">
        <p className="text-lg font-extrabold">{t("avgProtein", { protein: stats.avgProtein })}</p>
        <p className="text-xs text-muted">{t("proteinTarget", { protein: stats.proteinTarget })}</p>
      </Card>
    </div>
  );
}
