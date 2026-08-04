/**
 * IANA timezone-aware conversion without a date library. `openAt`/`closeAt`
 * are stored as UTC instants; admins pick a wall-clock date+time plus an
 * IANA zone (default Asia/Ho_Chi_Minh) and we need to convert between the
 * two. This uses the same offset-correction technique date-fns-tz uses
 * internally: format a UTC instant back into the target zone, measure the
 * drift, and correct for it (two passes handles DST-transition edge cases).
 */

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function getOffsetMs(utcInstant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(utcInstant);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  );
  return asUtc - utcInstant.getTime();
}

/** Converts a wall-clock date+time in `timeZone` to the equivalent UTC instant. */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);

  const offset1 = getOffsetMs(new Date(naiveUtcMs), timeZone);
  const offset2 = getOffsetMs(new Date(naiveUtcMs - offset1), timeZone);
  return new Date(naiveUtcMs - offset2);
}

/** Breaks a UTC instant down into wall-clock parts in `timeZone`. */
export function utcToZonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

/** Formats a UTC instant as a `datetime-local` input value ("YYYY-MM-DDTHH:mm") in `timeZone`. */
export function toDateTimeLocalValue(date: Date, timeZone: string): string {
  const p = utcToZonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const CURATED_TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Paris",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
];

/** Curated list for the timezone <Select>, falling back to the full IANA list if available. */
export function listTimeZones(): string[] {
  try {
    const all = Intl.supportedValuesOf?.("timeZone");
    if (all?.length) {
      const set = new Set([...CURATED_TIMEZONES, ...all]);
      return Array.from(set).sort();
    }
  } catch {
    // Intl.supportedValuesOf unavailable — fall through to curated list.
  }
  return CURATED_TIMEZONES;
}

export const DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";
