// Canonical "day" for the whole app. The LeetCode sync stamps each solve with
// its Central-time calendar day, so the client must compute "today" the same way
// — otherwise a user in another timezone would see a different today than the
// sync recorded, breaking streaks and the daily goal.

export const APP_TZ = "America/Chicago";

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date as "YYYY-MM-DD" in the app timezone (US Central). */
export function todayStr(): string {
  return fmt.format(new Date());
}

/** Shift a "YYYY-MM-DD" string by n calendar days (timezone-agnostic). */
export function addDaysStr(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
