import { describe, expect, it, vi, beforeEach } from "vitest";

const examSchedule = {
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
const examAuditLog = { create: vi.fn() };
const vocabularySet = { findUnique: vi.fn(), create: vi.fn() };

vi.mock("@/lib/prisma", () => ({
  prisma: { examSchedule, examAuditLog, vocabularySet },
}));

const {
  createSchedule,
  updateSchedule,
  openNow,
  closeNow,
  duplicateSchedule,
  ScheduleForbiddenError,
  ScheduleValidationError,
} = await import("@/lib/exam-scheduling/service");

const NOW = new Date("2026-08-04T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const TEACHER = { id: "teacher_1", role: "TEACHER" as const };
const SUPER = { id: "super_1", role: "SUPER_ADMIN" as const };

function scheduleRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sched_1",
    setId: "set_1",
    description: null,
    attemptLimit: null,
    openAt: new Date(NOW.getTime() - HOUR),
    closeAt: new Date(NOW.getTime() + HOUR),
    timezone: "Asia/Ho_Chi_Minh",
    status: "OPEN",
    publishedAt: NOW,
    archivedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(examSchedule).forEach((fn) => fn.mockReset());
  examAuditLog.create.mockReset().mockResolvedValue({});
  vocabularySet.findUnique.mockReset();
  vocabularySet.create.mockReset();
  examSchedule.update.mockImplementation((args) => Promise.resolve({ ...scheduleRow(), ...args.data }));
  examSchedule.create.mockImplementation((args) => Promise.resolve({ id: "new_sched", ...args.data }));
});

describe("createSchedule", () => {
  it("creates a schedule when the set has none yet", async () => {
    examSchedule.findUnique.mockResolvedValue(null);

    await createSchedule(
      {
        setId: "set_1",
        openAt: new Date(NOW.getTime() + HOUR),
        closeAt: new Date(NOW.getTime() + 2 * HOUR),
        timezone: "Asia/Ho_Chi_Minh",
        isDraft: false,
      },
      TEACHER,
      NOW
    );

    expect(examSchedule.create).toHaveBeenCalledOnce();
    expect(examAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "created" }) })
    );
  });

  it("rejects a duplicate schedule for the same set", async () => {
    examSchedule.findUnique.mockResolvedValue(scheduleRow());

    await expect(
      createSchedule(
        {
          setId: "set_1",
          openAt: new Date(NOW.getTime() + HOUR),
          closeAt: new Date(NOW.getTime() + 2 * HOUR),
          timezone: "Asia/Ho_Chi_Minh",
          isDraft: false,
        },
        TEACHER,
        NOW
      )
    ).rejects.toThrow(ScheduleValidationError);
  });

  it("rejects openAt after closeAt", async () => {
    examSchedule.findUnique.mockResolvedValue(null);

    await expect(
      createSchedule(
        {
          setId: "set_1",
          openAt: new Date(NOW.getTime() + 2 * HOUR),
          closeAt: new Date(NOW.getTime() + HOUR),
          timezone: "Asia/Ho_Chi_Minh",
          isDraft: false,
        },
        TEACHER,
        NOW
      )
    ).rejects.toThrow(ScheduleValidationError);
  });
});

describe("updateSchedule permissions", () => {
  it("blocks a TEACHER from editing a CLOSED schedule", async () => {
    examSchedule.findUnique.mockResolvedValue(
      scheduleRow({ openAt: new Date(NOW.getTime() - 2 * HOUR), closeAt: new Date(NOW.getTime() - HOUR) })
    );

    await expect(
      updateSchedule(
        "sched_1",
        {
          openAt: new Date(NOW.getTime() + HOUR),
          closeAt: new Date(NOW.getTime() + 2 * HOUR),
          timezone: "Asia/Ho_Chi_Minh",
          isDraft: false,
        },
        TEACHER,
        NOW
      )
    ).rejects.toThrow(ScheduleForbiddenError);
  });

  it("allows a SUPER_ADMIN to edit a CLOSED schedule", async () => {
    examSchedule.findUnique.mockResolvedValue(
      scheduleRow({ openAt: new Date(NOW.getTime() - 2 * HOUR), closeAt: new Date(NOW.getTime() - HOUR) })
    );

    await expect(
      updateSchedule(
        "sched_1",
        {
          openAt: new Date(NOW.getTime() + HOUR),
          closeAt: new Date(NOW.getTime() + 2 * HOUR),
          timezone: "Asia/Ho_Chi_Minh",
          isDraft: false,
        },
        SUPER,
        NOW
      )
    ).resolves.toBeTruthy();
  });

  it("allows editing a SCHEDULED schedule freely", async () => {
    examSchedule.findUnique.mockResolvedValue(
      scheduleRow({ openAt: new Date(NOW.getTime() + HOUR), closeAt: new Date(NOW.getTime() + 2 * HOUR) })
    );

    await expect(
      updateSchedule(
        "sched_1",
        {
          openAt: new Date(NOW.getTime() + 3 * HOUR),
          closeAt: new Date(NOW.getTime() + 4 * HOUR),
          timezone: "Asia/Ho_Chi_Minh",
          isDraft: false,
        },
        TEACHER,
        NOW
      )
    ).resolves.toBeTruthy();
  });
});

describe("openNow / closeNow", () => {
  it("openNow rewrites openAt to now and marks OPEN", async () => {
    examSchedule.findUnique.mockResolvedValue(
      scheduleRow({ status: "SCHEDULED", openAt: new Date(NOW.getTime() + HOUR), closeAt: new Date(NOW.getTime() + 2 * HOUR) })
    );

    await openNow("sched_1", TEACHER, NOW);

    const call = examSchedule.update.mock.calls[0][0];
    expect(call.data.openAt).toEqual(NOW);
    expect(call.data.status).toBe("OPEN");
    expect(call.data.openedBy).toBe(TEACHER.id);
  });

  it("openNow rejects an already-OPEN schedule", async () => {
    examSchedule.findUnique.mockResolvedValue(
      scheduleRow({ openAt: new Date(NOW.getTime() - HOUR), closeAt: new Date(NOW.getTime() + HOUR) })
    );

    await expect(openNow("sched_1", TEACHER, NOW)).rejects.toThrow(ScheduleValidationError);
  });

  it("closeNow pulls openAt back to now when closing a still-SCHEDULED exam early", async () => {
    examSchedule.findUnique.mockResolvedValue(
      scheduleRow({ openAt: new Date(NOW.getTime() + HOUR), closeAt: new Date(NOW.getTime() + 2 * HOUR) })
    );

    await closeNow("sched_1", TEACHER, NOW);

    const call = examSchedule.update.mock.calls[0][0];
    expect(call.data.openAt).toEqual(NOW);
    expect(call.data.closeAt).toEqual(NOW);
    expect(call.data.status).toBe("CLOSED");
  });

  it("closeNow rejects a DRAFT schedule", async () => {
    examSchedule.findUnique.mockResolvedValue(scheduleRow({ publishedAt: null }));

    await expect(closeNow("sched_1", TEACHER, NOW)).rejects.toThrow(ScheduleValidationError);
  });
});

describe("duplicateSchedule", () => {
  it("copies the set + vocabularies and creates a fresh DRAFT schedule", async () => {
    examSchedule.findUnique.mockResolvedValue({
      ...scheduleRow(),
      set: {
        id: "set_1",
        slug: "week-1",
        title: "Week 1",
        totalQuestions: 10,
        passScore: 8,
        secondsPerQuestion: 20,
        quizDirection: "vi_en",
        allowAnswerReview: true,
        showWrongAnswer: true,
        wrongAnswerDisplayMs: 2400,
        isActive: true,
        vocabularies: [{ english: "cat", vietnamese: "mèo", acceptedAnswers: [], acceptedAnswersVi: [] }],
      },
    });
    vocabularySet.findUnique.mockResolvedValue(null); // slug is free
    vocabularySet.create.mockResolvedValue({ id: "set_2" });

    await duplicateSchedule("sched_1", TEACHER);

    expect(vocabularySet.create).toHaveBeenCalledOnce();
    const createArgs = vocabularySet.create.mock.calls[0][0].data;
    expect(createArgs.title).toBe("Week 1 (Copy)");

    const scheduleCreateArgs = examSchedule.create.mock.calls[0][0].data;
    expect(scheduleCreateArgs.setId).toBe("set_2");
    expect(scheduleCreateArgs.status).toBe("DRAFT");
    expect(scheduleCreateArgs.publishedAt).toBeNull();
  });
});
