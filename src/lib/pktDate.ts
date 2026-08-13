/**
 * Pakistan (Asia/Karachi, UTC+5, no DST) date helpers.
 *
 * Date-picker defaults across the app used `new Date().toISOString().slice(0, 10)`,
 * which is the UTC date — ~5 hours behind Pakistan time. Between midnight and 5am PKT
 * that silently defaults fields to yesterday's date. Use `todayPKT()` instead wherever
 * a form needs "today" as its default.
 */

const PKT_TIME_ZONE = "Asia/Karachi";

/** "YYYY-MM-DD" for the given instant (defaults to now) in Pakistan local time. */
export function todayPKT(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PKT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
