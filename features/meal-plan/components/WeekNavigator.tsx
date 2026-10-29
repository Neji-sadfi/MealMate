"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatWeekRange } from "../services/format";

type WeekNavigatorProps = {
  weekStart: string;
  weekEnd: string;
  onPrevious: () => void;
  onNext: () => void;
};

export function WeekNavigator({ weekStart, weekEnd, onPrevious, onNext }: WeekNavigatorProps) {
  const t = useTranslations("pages.mealPlan.week");
  const locale = useLocale();

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label={t("previous")}
        onClick={onPrevious}
        className="flex size-10 items-center justify-center rounded-full text-primary hover:bg-tint"
      >
        <ChevronLeft aria-hidden className="size-5" />
      </button>
      <p className="text-center text-sm font-bold text-primary">
        {formatWeekRange(weekStart, weekEnd, locale)}
      </p>
      <button
        type="button"
        aria-label={t("next")}
        onClick={onNext}
        className="flex size-10 items-center justify-center rounded-full text-primary hover:bg-tint"
      >
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </div>
  );
}
