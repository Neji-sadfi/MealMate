import { parseISODate } from "./week";

export function formatDayMonth(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(
    parseISODate(iso),
  );
}

export function formatWeekRange(weekStartIso: string, weekEndIso: string, locale: string): string {
  const start = parseISODate(weekStartIso);
  const end = parseISODate(weekEndIso);
  const startDay = new Intl.DateTimeFormat(locale, { day: "numeric" }).format(start);
  const endLabel = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(end);
  return `${startDay} – ${endLabel}`;
}

export function formatDayHeading(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseISODate(iso));
}

export function formatPantryList(names: string[], locale: string): string {
  return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(names);
}

export function dayNumber(iso: string): number {
  return parseISODate(iso).getDate();
}
