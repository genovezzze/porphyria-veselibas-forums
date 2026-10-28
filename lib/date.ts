import type { Weekday, TimeOfDay } from "./types";

// Pure date helpers that work on "YYYY-MM-DD" / "YYYY-MM-DDTHH:mm" strings.
// We avoid the host Date timezone by treating these as Europe/Riga wall-clock
// and computing weekdays arithmetically (Sakamoto's algorithm). This keeps the
// UI's date and weekday in sync regardless of where the server runs.

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

// Latvian month abbreviations and weekday display names.
const MONTHS = [
  "janv.", "febr.", "marts", "apr.", "maijs", "jūn.",
  "jūl.", "aug.", "sept.", "okt.", "nov.", "dec.",
];

const WEEKDAY_LV: Record<Weekday, string> = {
  monday: "Pirmdiena",
  tuesday: "Otrdiena",
  wednesday: "Trešdiena",
  thursday: "Ceturtdiena",
  friday: "Piektdiena",
  saturday: "Sestdiena",
  sunday: "Svētdiena",
};

/** Latvian display name for a weekday slug. */
export function latvianWeekday(wd: Weekday): string {
  return WEEKDAY_LV[wd];
}

/** Day-of-week index 0=Sunday..6=Saturday for a Y-M-D (Sakamoto). */
export function dayOfWeekIndex(year: number, month: number, day: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = month < 3 ? year - 1 : year;
  return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + t[month - 1] + day) % 7;
}

export function weekdayOf(dateStr: string): Weekday {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAYS[dayOfWeekIndex(y, m, d)];
}

/** Add days to a "YYYY-MM-DD" string, returning a new "YYYY-MM-DD" string. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** Classify a "HH:mm" time into a part of day (never returns "any"). */
export function timeOfDayOf(timeStr: string): Exclude<TimeOfDay, "any"> {
  const [h] = timeStr.split(":").map(Number);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "after-work";
}

/** Minutes since midnight for a "YYYY-MM-DDTHH:mm" local string. */
export function minutesSinceEpochLocal(iso: string): number {
  const [date, time] = iso.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  // Days since a fixed epoch via UTC math (no tz offset applied — wall clock).
  const days = Math.floor(Date.UTC(y, mo - 1, d) / 86400000);
  return days * 24 * 60 + h * 60 + mi;
}

/** Pretty label like "Piektdiena, 7. nov. · 18:30". */
export function labelFor(iso: string): string {
  const [date, time] = iso.split("T");
  const [, m, d] = date.split("-").map(Number);
  const wd = weekdayOf(date);
  return `${WEEKDAY_LV[wd]}, ${d}. ${MONTHS[m - 1]} · ${time}`;
}

/**
 * Build the demo Monday→Friday week. Anchored to the Monday of the week that
 * contains `todayStr` (so the demo always feels current), but fully deterministic
 * given its input.
 */
export function demoWeekDates(todayStr: string): string[] {
  const idx = dayOfWeekIndex(
    ...(todayStr.split("-").map(Number) as [number, number, number])
  );
  // Convert Sun=0..Sat=6 to offset back to Monday.
  const offsetToMonday = idx === 0 ? -6 : 1 - idx;
  const monday = addDays(todayStr, offsetToMonday);
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

/** Today's date in Europe/Riga as "YYYY-MM-DD". */
export function rigaToday(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Riga",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // en-CA gives YYYY-MM-DD
}
