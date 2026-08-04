import { describe, expect, it } from "vitest";
import {
  isValidTimeZone,
  toDateTimeLocalValue,
  utcToZonedParts,
  zonedTimeToUtc,
} from "@/lib/exam-scheduling/timezone";

describe("zonedTimeToUtc / utcToZonedParts", () => {
  it("converts Asia/Ho_Chi_Minh (UTC+7, no DST) correctly", () => {
    const utc = zonedTimeToUtc("2026-08-05", "08:00", "Asia/Ho_Chi_Minh");
    expect(utc.toISOString()).toBe("2026-08-05T01:00:00.000Z");
  });

  it("round-trips through utcToZonedParts", () => {
    const utc = zonedTimeToUtc("2026-01-15", "14:30", "Asia/Ho_Chi_Minh");
    const parts = utcToZonedParts(utc, "Asia/Ho_Chi_Minh");
    expect(parts).toEqual({ year: 2026, month: 1, day: 15, hour: 14, minute: 30 });
  });

  it("handles a DST-observing zone (America/New_York) in both summer and winter", () => {
    const summer = zonedTimeToUtc("2026-07-01", "09:00", "America/New_York"); // EDT, UTC-4
    expect(summer.toISOString()).toBe("2026-07-01T13:00:00.000Z");

    const winter = zonedTimeToUtc("2026-01-01", "09:00", "America/New_York"); // EST, UTC-5
    expect(winter.toISOString()).toBe("2026-01-01T14:00:00.000Z");
  });

  it("toDateTimeLocalValue formats as datetime-local input value", () => {
    const utc = new Date("2026-08-05T01:00:00.000Z");
    expect(toDateTimeLocalValue(utc, "Asia/Ho_Chi_Minh")).toBe("2026-08-05T08:00");
  });
});

describe("isValidTimeZone", () => {
  it("accepts a real IANA zone", () => {
    expect(isValidTimeZone("Asia/Ho_Chi_Minh")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects garbage input", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
