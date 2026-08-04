import { describe, expect, it } from "vitest";
import { ScheduleValidationError, validateScheduleInput } from "@/lib/exam-scheduling/validation";

const NOW = new Date("2026-08-04T10:00:00Z");
const HOUR = 60 * 60 * 1000;

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    setId: "set_1",
    description: null,
    attemptLimit: null,
    openAt: new Date(NOW.getTime() + HOUR),
    closeAt: new Date(NOW.getTime() + 2 * HOUR),
    timezone: "Asia/Ho_Chi_Minh",
    isDraft: false,
    ...overrides,
  };
}

describe("validateScheduleInput", () => {
  it("accepts a valid create input", () => {
    const result = validateScheduleInput(validInput(), NOW);
    expect(result.setId).toBe("set_1");
  });

  it("rejects openAt after closeAt", () => {
    expect(() =>
      validateScheduleInput(
        validInput({ openAt: new Date(NOW.getTime() + 3 * HOUR), closeAt: new Date(NOW.getTime() + HOUR) }),
        NOW
      )
    ).toThrow(ScheduleValidationError);
  });

  it("rejects closeAt in the past", () => {
    expect(() =>
      validateScheduleInput(
        validInput({ openAt: new Date(NOW.getTime() - 2 * HOUR), closeAt: new Date(NOW.getTime() - HOUR) }),
        NOW
      )
    ).toThrow(ScheduleValidationError);
  });

  it("allows closeAt in the past when skipPastCheck is set (editing a CLOSED schedule)", () => {
    const result = validateScheduleInput(
      validInput({ openAt: new Date(NOW.getTime() - 2 * HOUR), closeAt: new Date(NOW.getTime() - HOUR) }),
      NOW,
      { skipPastCheck: true }
    );
    expect(result.closeAt.getTime()).toBeLessThan(NOW.getTime());
  });

  it("rejects missing setId", () => {
    expect(() => validateScheduleInput(validInput({ setId: "" }), NOW)).toThrow(ScheduleValidationError);
  });

  it("rejects an invalid timezone", () => {
    expect(() => validateScheduleInput(validInput({ timezone: "Not/AZone" }), NOW)).toThrow(
      ScheduleValidationError
    );
  });

  it("rejects a non-positive attemptLimit", () => {
    expect(() => validateScheduleInput(validInput({ attemptLimit: 0 }), NOW)).toThrow(
      ScheduleValidationError
    );
  });

  it("skips the openAt<closeAt rule for drafts (dates may be placeholders)", () => {
    const result = validateScheduleInput(
      validInput({ isDraft: true, openAt: new Date(NOW.getTime() + 3 * HOUR), closeAt: new Date(NOW.getTime() + HOUR) }),
      NOW
    );
    expect(result.isDraft).toBe(true);
  });
});
