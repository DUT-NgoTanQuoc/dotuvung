import { describe, expect, it, vi, beforeEach } from "vitest";

const examSchedule = {
  findMany: vi.fn(),
  update: vi.fn(),
};
const examAuditLog = { create: vi.fn() };

vi.mock("@/lib/prisma", () => ({
  prisma: { examSchedule, examAuditLog },
}));

const { transitionDueExams } = await import("@/lib/exam-scheduling/scheduler");

const NOW = new Date("2026-08-04T10:00:00Z");
const HOUR = 60 * 60 * 1000;

function row(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    status: "SCHEDULED",
    openAt: new Date(NOW.getTime() - HOUR),
    closeAt: new Date(NOW.getTime() + HOUR),
    publishedAt: NOW,
    archivedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  examSchedule.findMany.mockReset();
  examSchedule.update.mockReset().mockResolvedValue({});
  examAuditLog.create.mockReset().mockResolvedValue({});
});

describe("transitionDueExams", () => {
  it("transitions multiple due schedules in one sweep", async () => {
    examSchedule.findMany.mockResolvedValue([row("a"), row("b")]);

    const result = await transitionDueExams(NOW);

    expect(result).toEqual({ checked: 2, transitioned: 2, errors: 0 });
    expect(examSchedule.update).toHaveBeenCalledTimes(2);
    expect(examAuditLog.create).toHaveBeenCalledTimes(2);
    expect(examAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "auto_opened" }) })
    );
  });

  it("does not touch schedules whose cached status already matches", async () => {
    examSchedule.findMany.mockResolvedValue([row("a", { status: "OPEN" })]);

    const result = await transitionDueExams(NOW);

    expect(result).toEqual({ checked: 1, transitioned: 0, errors: 0 });
    expect(examSchedule.update).not.toHaveBeenCalled();
  });

  it("one failing row is recorded as an error without stopping the rest", async () => {
    examSchedule.findMany.mockResolvedValue([row("bad"), row("good")]);
    examSchedule.update.mockImplementation(({ where }) =>
      where.id === "bad" ? Promise.reject(new Error("db down")) : Promise.resolve({})
    );

    const result = await transitionDueExams(NOW);

    expect(result.checked).toBe(2);
    expect(result.transitioned).toBe(1);
    expect(result.errors).toBe(1);
  });

  it("writes auto_closed for schedules past their closeAt", async () => {
    examSchedule.findMany.mockResolvedValue([
      row("c", { openAt: new Date(NOW.getTime() - 2 * HOUR), closeAt: new Date(NOW.getTime() - HOUR), status: "OPEN" }),
    ]);

    await transitionDueExams(NOW);

    expect(examAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "auto_closed" }) })
    );
  });
});
