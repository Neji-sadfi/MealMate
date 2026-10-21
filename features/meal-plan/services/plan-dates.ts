// UTC calendar helpers for meal plans. Weeks are stored as Monday 00:00 UTC
// (see models/MealPlan.ts) and every date crossing the API is a YYYY-MM-DD
// string, so the server and the screen stay on the same calendar day.
import { toISODate } from "./week";

export function utcDateOf(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

export function isoOfUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Monday 00:00 UTC of the week containing `iso`. */
export function mondayUtcOf(iso: string): Date {
  const date = utcDateOf(iso);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

/**
 * The current week's Monday as YYYY-MM-DD. "Today" is a local calendar day,
 * so the week is the one the user is living in, not the UTC one.
 */
export function currentWeekStartIso(now: Date = new Date()): string {
  return isoOfUtc(mondayUtcOf(toISODate(now)));
}
