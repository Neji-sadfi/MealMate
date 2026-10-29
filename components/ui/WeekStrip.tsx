"use client";

export type WeekStripDay = {
  /** ISO date of the day (YYYY-MM-DD). */
  date: string;
  /** Short label of the day, e.g. "Mon". */
  label: string;
  /** Full label of the day, read by the screen readers, e.g. "Monday". */
  fullLabel: string;
  /** True when the day has something planned on it. */
  hasContent: boolean;
};

type WeekStripProps = {
  days: WeekStripDay[];
  /** ISO date of the day that is currently shown. */
  selectedDate: string;
  onSelect: (date: string) => void;
  /** Accessible name of the strip. */
  label: string;
};

/** The day of the month of an ISO date (2026-10-19 -> 19). */
function dayOfMonth(iso: string): number {
  const day = Number(iso.slice(8, 10));
  return Number.isFinite(day) ? day : 0;
}

/**
 * The row of days of a week: the day of the month, the name of the weekday and
 * a dot when the day has something planned on it.
 *
 * The component is shared: the caller gives the labels, so it works with any
 * language and with any kind of plan.
 */
export function WeekStrip({ days, selectedDate, onSelect, label }: WeekStripProps) {
  return (
    <div role="tablist" aria-label={label} className="flex justify-between gap-1">
      {days.map((day) => {
        const selected = day.date === selectedDate;
        return (
          <button
            key={day.date}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={day.fullLabel}
            onClick={() => onSelect(day.date)}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 py-1"
          >
            <span className="text-xs font-semibold text-muted">{day.label}</span>
            <span
              className={`flex size-9 items-center justify-center text-sm font-bold ${
                selected ? "rounded-full bg-primary text-primary-foreground" : "text-foreground"
              }`}
            >
              {dayOfMonth(day.date)}
            </span>
            <span
              className={`size-1.5 rounded-full ${day.hasContent ? "bg-primary" : "bg-transparent"}`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
