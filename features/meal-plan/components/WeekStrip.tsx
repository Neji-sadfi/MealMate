"use client";

import { useTranslations } from "next-intl";
import type { WeekStripDay } from "../types";
import { dayNumber } from "../services/format";

type WeekStripProps = {
  days: WeekStripDay[];
  selectedDate: string;
  onSelect: (date: string) => void;
};

export function WeekStrip({ days, selectedDate, onSelect }: WeekStripProps) {
  const t = useTranslations("pages.mealPlan");

  return (
    <div role="tablist" aria-label={t("weekStrip")} className="flex justify-between gap-1">
      {days.map((day) => {
        const selected = day.date === selectedDate;
        return (
          <button
            key={day.date}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={t(`weekdayLabels.${day.weekday}`)}
            onClick={() => onSelect(day.date)}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 py-1"
          >
            <span className="text-xs font-semibold text-muted">{t(`weekdays.${day.weekday}`)}</span>
            <span
              className={`flex size-9 items-center justify-center text-sm font-bold ${
                selected ? "rounded-full bg-primary text-primary-foreground" : "text-foreground"
              }`}
            >
              {dayNumber(day.date)}
            </span>
            <span
              className={`size-1.5 rounded-full ${day.hasMeals ? "bg-primary" : "bg-transparent"}`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
