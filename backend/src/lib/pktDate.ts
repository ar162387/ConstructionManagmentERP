/**
 * Pakistan (Asia/Karachi, UTC+5, no DST) date helpers.
 *
 * All timestamps are stored in UTC (the correct way to store them), but "today" /
 * "current month" defaults computed from `new Date().toISOString()` reflect the
 * server's UTC date — which runs ~5 hours behind Pakistan time and can be a full day
 * off for anyone in Pakistan between midnight and 5am. These helpers derive those
 * defaults in Pakistan local time instead.
 */

const PKT_TIME_ZONE = "Asia/Karachi";

function partsPKT(date: Date): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PKT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** "YYYY-MM-DD" for the given instant (defaults to now) in Pakistan local time. */
export function todayPKT(date: Date = new Date()): string {
  const { year, month, day } = partsPKT(date);
  return `${year}-${month}-${day}`;
}

/** "YYYY-MM" for the given instant (defaults to now) in Pakistan local time. */
export function monthKeyPKT(date: Date = new Date()): string {
  const { year, month } = partsPKT(date);
  return `${year}-${month}`;
}

/** The UTC instant corresponding to 00:00:00 Pakistan time on the given "YYYY-MM-DD" date. */
export function startOfDayPKT(pktDate: string): Date {
  return new Date(`${pktDate}T00:00:00+05:00`);
}

/** The UTC instant corresponding to 23:59:59.999 Pakistan time on the given "YYYY-MM-DD" date. */
export function endOfDayPKT(pktDate: string): Date {
  return new Date(`${pktDate}T23:59:59.999+05:00`);
}
