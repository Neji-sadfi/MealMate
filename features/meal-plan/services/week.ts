import { WEEKDAYS, type Weekday } from "../types";

/** Monday 00:00 in the user's local timezone. */
export function startOfWeekMonday(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function weekdayOf(iso: string): Weekday {
  const date = parseISODate(iso);
  const index = (date.getDay() + 6) % 7;
  return WEEKDAYS[index]!;
}

export function weekDates(weekStart: Date): string[] {
  return WEEKDAYS.map((_, index) => toISODate(addDays(weekStart, index)));
}

export function isSameDay(left: Date, right: Date): boolean {
  return toISODate(left) === toISODate(right);
}

/**
 * Whole days between two local calendar days (YYYY-MM-DD). Rounded so a
 * daylight-saving change never shifts the count by one.
 */
export function daysBetweenIso(fromIso: string, toIso: string): number {
  const from = parseISODate(fromIso);
  const to = parseISODate(toIso);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
