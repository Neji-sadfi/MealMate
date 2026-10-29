"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import type { DashboardBudget } from "../types";

type HomeBudgetCardProps = {
  budget: DashboardBudget;
};

export function HomeBudgetCard({ budget }: HomeBudgetCardProps) {
  const t = useTranslations("pages.home.budget");
  const hasBudget = budget.total > 0;
  const percent = hasBudget
    ? Math.min(100, Math.max(0, Math.round((budget.used / budget.total) * 100)))
    : 0;

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-extrabold">{t("title")}</h2>
        {hasBudget && (
          <p className="text-lg font-extrabold text-primary">{t("remaining", { amount: budget.remaining })}</p>
        )}
      </div>

      {!hasBudget ? (
        <p className="text-sm text-muted">{t("noBudget")}</p>
      ) : (
        <>
          {/*
            Local progress bar. It can be swapped for the shared ProgressBar from
            components/ui once that component exists (shared UI goes through a reviewed PR).
          */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={t("progressLabel", { percent })}
            className="h-3 w-full overflow-hidden rounded-full bg-tint"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>{t("used", { amount: budget.used })}</span>
            <span>{t("total", { amount: budget.total })}</span>
          </div>
        </>
      )}
    </Card>
  );
}
