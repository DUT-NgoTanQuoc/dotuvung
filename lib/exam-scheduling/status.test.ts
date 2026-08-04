import { describe, expect, it } from "vitest";
import { computeCountdown, computeStatus, formatDuration } from "@/lib/exam-scheduling/status";

const NOW = new Date("2026-08-04T10:00:00Z");
const HOUR = 60 * 60 * 1000;

function schedule(overrides: Partial<{
  openAt: Date;
  closeAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
}> = {}) {
  return {
    openAt: new Date(NOW.getTime() + HOUR),
    closeAt: new Date(NOW.getTime() + 2 * HOUR),
    publishedAt: NOW,
    archivedAt: null,
    ...overrides,
  };
}

describe("computeStatus", () => {
  it("is DRAFT when never published", () => {
    expect(computeStatus(schedule({ publishedAt: null }), NOW)).toBe("DRAFT");
  });

  it("is SCHEDULED before openAt", () => {
    expect(computeStatus(schedule(), NOW)).toBe("SCHEDULED");
  });

  it("is OPEN between openAt and closeAt", () => {
    const s = schedule({ openAt: new Date(NOW.getTime() - HOUR), closeAt: new Date(NOW.getTime() + HOUR) });
    expect(computeStatus(s, NOW)).toBe("OPEN");
  });

  it("is CLOSED at/after closeAt", () => {
    const s = schedule({ openAt: new Date(NOW.getTime() - 2 * HOUR), closeAt: new Date(NOW.getTime() - HOUR) });
    expect(computeStatus(s, NOW)).toBe("CLOSED");
  });

  it("treats now === closeAt as CLOSED (half-open interval)", () => {
    const s = schedule({ openAt: new Date(NOW.getTime() - HOUR), closeAt: NOW });
    expect(computeStatus(s, NOW)).toBe("CLOSED");
  });

  it("is ARCHIVED regardless of timestamps, even if still within the open window", () => {
    const s = schedule({
      openAt: new Date(NOW.getTime() - HOUR),
      closeAt: new Date(NOW.getTime() + HOUR),
      archivedAt: NOW,
    });
    expect(computeStatus(s, NOW)).toBe("ARCHIVED");
  });

  it("models Open Now by moving openAt to the current time", () => {
    const s = schedule({ openAt: NOW, closeAt: new Date(NOW.getTime() + HOUR) });
    expect(computeStatus(s, NOW)).toBe("OPEN");
  });

  it("models Close Now by moving closeAt to the current time, even for a not-yet-open schedule", () => {
    // Close Now on a SCHEDULED exam must also pull openAt back so openAt <= closeAt.
    const s = schedule({ openAt: NOW, closeAt: NOW });
    expect(computeStatus(s, NOW)).toBe("CLOSED");
  });
});

describe("computeCountdown", () => {
  it("reports msUntilOpen/msUntilClose alongside status", () => {
    const s = schedule();
    const info = computeCountdown(s, NOW);
    expect(info.status).toBe("SCHEDULED");
    expect(info.msUntilOpen).toBe(HOUR);
    expect(info.msUntilClose).toBe(2 * HOUR);
  });
});

describe("formatDuration", () => {
  it("formats days", () => {
    expect(formatDuration(25 * HOUR + 3 * 60 * 60 * 1000)).toBe("1 ngày 4 giờ");
  });
  it("formats hours", () => {
    expect(formatDuration(5 * HOUR)).toBe("5 giờ 0 phút");
  });
  it("formats minutes", () => {
    expect(formatDuration(3 * 60 * 1000)).toBe("3 phút");
  });
  it("floors negative/zero at 0 minutes", () => {
    expect(formatDuration(-1000)).toBe("0 phút");
  });
});
