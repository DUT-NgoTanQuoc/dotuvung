/**
 * Exam Schedule Service — the only module that talks to Prisma for exam
 * schedules. Server-only: import exclusively from server actions / server
 * components / the cron route (never from a "use client" file), mirroring
 * lib/theme/service.ts's convention-based boundary.
 */
import type { Prisma, ExamSchedule, ExamStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeStatus } from "@/lib/exam-scheduling/status";
import {
  ScheduleForbiddenError,
  ScheduleValidationError,
  validateScheduleInput,
} from "@/lib/exam-scheduling/validation";
import type {
  Actor,
  CreateScheduleInput,
  ScheduleFilters,
  UpdateScheduleInput,
} from "@/lib/exam-scheduling/types";

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function requireAdmin(actor: Actor): void {
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "TEACHER") {
    throw new ScheduleForbiddenError("Chỉ Admin hoặc Super Admin được lên lịch bài kiểm tra.");
  }
}

function requireSuperAdminForEdit(actor: Actor, currentStatus: ExamStatus): void {
  if ((currentStatus === "CLOSED" || currentStatus === "ARCHIVED") && actor.role !== "SUPER_ADMIN") {
    throw new ScheduleForbiddenError(
      "Bài kiểm tra đã đóng/lưu trữ — chỉ Super Admin được sửa lịch."
    );
  }
}

export type ScheduleWithSet = ExamSchedule & {
  set: { id: string; title: string; slug: string };
};

/**
 * Recomputes status for a batch of rows and persists any drift, writing an
 * `auto_opened`/`auto_closed` audit row for each transition. Shared by the
 * admin list/dashboard reads, the single-schedule lookup used by student
 * gating, and the cron sweep (lib/exam-scheduling/scheduler.ts) — this is
 * the one place "did the status actually change" logic lives, so the cron
 * and every read path agree and nothing is duplicated.
 */
export async function selfHealMany(
  rows: ExamSchedule[],
  now: Date
): Promise<{ statuses: Map<string, ExamStatus>; transitioned: number; errors: number }> {
  const statuses = new Map<string, ExamStatus>();
  let transitioned = 0;
  let errors = 0;

  await Promise.all(
    rows.map(async (row) => {
      const computed = computeStatus(row, now);
      statuses.set(row.id, computed);
      if (computed === row.status) return;

      try {
        await prisma.examSchedule.update({
          where: { id: row.id },
          data: { status: computed },
        });
        await prisma.examAuditLog.create({
          data: {
            scheduleId: row.id,
            adminId: null,
            action: computed === "OPEN" ? "auto_opened" : "auto_closed",
            oldValues: toJson({ status: row.status }),
            newValues: toJson({ status: computed }),
          },
        });
        transitioned++;
      } catch (err) {
        // Never let one bad row crash the sweep or a page load.
        errors++;
        console.error(`[exam-scheduling] self-heal failed for schedule ${row.id}:`, err);
      }
    })
  );

  return { statuses, transitioned, errors };
}

export async function getScheduleWithComputedStatus(
  setId: string,
  now: Date
): Promise<{ schedule: ExamSchedule; status: ExamStatus } | null> {
  const schedule = await prisma.examSchedule.findUnique({ where: { setId } });
  if (!schedule) return null;
  const { statuses } = await selfHealMany([schedule], now);
  return { schedule, status: statuses.get(schedule.id) ?? schedule.status };
}

export async function listSchedulesForAdmin(
  filters: ScheduleFilters,
  now: Date
): Promise<Array<ScheduleWithSet & { computedStatus: ExamStatus }>> {
  const rows = await prisma.examSchedule.findMany({
    include: { set: { select: { id: true, title: true, slug: true } } },
    orderBy: { openAt: "asc" },
  });

  const { statuses } = await selfHealMany(rows, now);

  let result = rows.map((row) => ({
    ...row,
    computedStatus: statuses.get(row.id) ?? row.status,
  }));

  if (filters.status) {
    result = result.filter((r) => r.computedStatus === filters.status);
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (r) => r.set.title.toLowerCase().includes(q) || r.set.slug.toLowerCase().includes(q)
    );
  }
  return result;
}

export async function getDashboardCounts(now: Date): Promise<Record<ExamStatus, number>> {
  const rows = await prisma.examSchedule.findMany({
    select: { id: true, openAt: true, closeAt: true, publishedAt: true, archivedAt: true, status: true },
  });
  const counts: Record<ExamStatus, number> = {
    DRAFT: 0,
    SCHEDULED: 0,
    OPEN: 0,
    CLOSED: 0,
    ARCHIVED: 0,
  };
  for (const row of rows) {
    counts[computeStatus(row, now)]++;
  }
  return counts;
}

export async function getUpcoming(now: Date, limit = 10): Promise<ScheduleWithSet[]> {
  const rows = await prisma.examSchedule.findMany({
    where: { publishedAt: { not: null }, archivedAt: null, openAt: { gt: now } },
    include: { set: { select: { id: true, title: true, slug: true } } },
    orderBy: { openAt: "asc" },
    take: limit,
  });
  return rows.filter((r) => computeStatus(r, now) === "SCHEDULED");
}

export async function getActive(now: Date): Promise<ScheduleWithSet[]> {
  const rows = await prisma.examSchedule.findMany({
    where: { publishedAt: { not: null }, archivedAt: null, openAt: { lte: now }, closeAt: { gt: now } },
    include: { set: { select: { id: true, title: true, slug: true } } },
    orderBy: { closeAt: "asc" },
  });
  return rows.filter((r) => computeStatus(r, now) === "OPEN");
}

export async function getRecentActivity(limit = 20) {
  return prisma.examAuditLog.findMany({
    where: { action: { in: ["auto_opened", "auto_closed"] } },
    include: { schedule: { include: { set: { select: { title: true } } } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

function computeInitialStatus(
  input: { openAt: Date; closeAt: Date; isDraft: boolean },
  now: Date
): { status: ExamStatus; publishedAt: Date | null } {
  if (input.isDraft) return { status: "DRAFT", publishedAt: null };
  const status = computeStatus({ ...input, publishedAt: now, archivedAt: null }, now);
  return { status, publishedAt: now };
}

export async function createSchedule(
  input: CreateScheduleInput,
  actor: Actor,
  now: Date
): Promise<ExamSchedule> {
  requireAdmin(actor);
  const data = validateScheduleInput(input, now);

  const existing = await prisma.examSchedule.findUnique({ where: { setId: data.setId } });
  if (existing) {
    throw new ScheduleValidationError("Bộ từ vựng này đã có lịch kiểm tra.");
  }

  const { status, publishedAt } = computeInitialStatus(data, now);

  const schedule = await prisma.examSchedule.create({
    data: {
      setId: data.setId,
      description: data.description ?? null,
      attemptLimit: data.attemptLimit ?? null,
      openAt: data.openAt,
      closeAt: data.closeAt,
      timezone: data.timezone,
      status,
      publishedAt,
      createdBy: actor.id,
    },
  });

  await prisma.examAuditLog.create({
    data: {
      scheduleId: schedule.id,
      adminId: actor.id,
      action: "created",
      newValues: toJson(data),
    },
  });

  return schedule;
}

export async function updateSchedule(
  scheduleId: string,
  input: UpdateScheduleInput,
  actor: Actor,
  now: Date
): Promise<ExamSchedule> {
  requireAdmin(actor);

  const existing = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
  if (!existing) throw new ScheduleValidationError("Không tìm thấy lịch kiểm tra.");

  const currentStatus = computeStatus(existing, now);
  requireSuperAdminForEdit(actor, currentStatus);

  const data = validateScheduleInput(
    { ...input, setId: existing.setId },
    now,
    { skipPastCheck: currentStatus === "CLOSED" || currentStatus === "ARCHIVED" }
  );

  const publishedAt = data.isDraft ? null : existing.publishedAt ?? now;
  const status = data.isDraft
    ? "DRAFT"
    : computeStatus({ ...data, publishedAt, archivedAt: existing.archivedAt }, now);

  const schedule = await prisma.examSchedule.update({
    where: { id: scheduleId },
    data: {
      description: data.description ?? null,
      attemptLimit: data.attemptLimit ?? null,
      openAt: data.openAt,
      closeAt: data.closeAt,
      timezone: data.timezone,
      status,
      publishedAt,
      updatedBy: actor.id,
    },
  });

  await prisma.examAuditLog.create({
    data: {
      scheduleId,
      adminId: actor.id,
      action: "updated",
      oldValues: toJson({
        openAt: existing.openAt,
        closeAt: existing.closeAt,
        timezone: existing.timezone,
        attemptLimit: existing.attemptLimit,
      }),
      newValues: toJson({
        openAt: data.openAt,
        closeAt: data.closeAt,
        timezone: data.timezone,
        attemptLimit: data.attemptLimit,
      }),
    },
  });

  return schedule;
}

export async function deleteSchedule(scheduleId: string, actor: Actor): Promise<void> {
  requireAdmin(actor);
  await prisma.examSchedule.delete({ where: { id: scheduleId } });
}

export async function openNow(scheduleId: string, actor: Actor, now: Date): Promise<ExamSchedule> {
  requireAdmin(actor);
  const existing = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
  if (!existing) throw new ScheduleValidationError("Không tìm thấy lịch kiểm tra.");

  const currentStatus = computeStatus(existing, now);
  if (currentStatus === "OPEN") throw new ScheduleValidationError("Bài kiểm tra đang mở rồi.");
  if (currentStatus === "CLOSED" || currentStatus === "ARCHIVED") {
    throw new ScheduleValidationError("Không thể mở ngay một bài đã đóng/lưu trữ.");
  }

  const schedule = await prisma.examSchedule.update({
    where: { id: scheduleId },
    data: {
      openAt: now,
      status: "OPEN",
      openedAt: now,
      openedBy: actor.id,
      publishedAt: existing.publishedAt ?? now,
    },
  });

  await prisma.examAuditLog.create({
    data: {
      scheduleId,
      adminId: actor.id,
      action: "opened_now",
      oldValues: toJson({ openAt: existing.openAt, status: existing.status }),
      newValues: toJson({ openAt: now, status: "OPEN" }),
    },
  });

  return schedule;
}

export async function closeNow(scheduleId: string, actor: Actor, now: Date): Promise<ExamSchedule> {
  requireAdmin(actor);
  const existing = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
  if (!existing) throw new ScheduleValidationError("Không tìm thấy lịch kiểm tra.");

  const currentStatus = computeStatus(existing, now);
  if (currentStatus !== "OPEN" && currentStatus !== "SCHEDULED") {
    throw new ScheduleValidationError("Chỉ có thể đóng ngay bài đang mở hoặc đã lên lịch.");
  }

  // Ensure openAt <= closeAt <= now so computeStatus resolves to CLOSED even
  // if the schedule hadn't opened yet (closing a still-SCHEDULED exam early).
  const openAt = existing.openAt.getTime() > now.getTime() ? now : existing.openAt;

  const schedule = await prisma.examSchedule.update({
    where: { id: scheduleId },
    data: {
      openAt,
      closeAt: now,
      status: "CLOSED",
      closedAt: now,
      closedBy: actor.id,
    },
  });

  await prisma.examAuditLog.create({
    data: {
      scheduleId,
      adminId: actor.id,
      action: "closed_now",
      oldValues: toJson({ closeAt: existing.closeAt, status: existing.status }),
      newValues: toJson({ closeAt: now, status: "CLOSED" }),
    },
  });

  return schedule;
}

export async function archiveSchedule(
  scheduleId: string,
  actor: Actor,
  now: Date
): Promise<ExamSchedule> {
  requireAdmin(actor);
  const existing = await prisma.examSchedule.findUnique({ where: { id: scheduleId } });
  if (!existing) throw new ScheduleValidationError("Không tìm thấy lịch kiểm tra.");

  const schedule = await prisma.examSchedule.update({
    where: { id: scheduleId },
    data: { archivedAt: now, status: "ARCHIVED", updatedBy: actor.id },
  });

  await prisma.examAuditLog.create({
    data: {
      scheduleId,
      adminId: actor.id,
      action: "archived",
      oldValues: toJson({ status: existing.status }),
      newValues: toJson({ status: "ARCHIVED" }),
    },
  });

  return schedule;
}

/**
 * Duplicates the schedule's underlying VocabularySet (title + " (Copy)",
 * fresh slug, cloned vocabularies) plus a fresh DRAFT schedule with the same
 * config but unpublished — admin only needs to adjust the dates, per
 * "Duplicate → Copy toàn bộ → Chỉ đổi ngày".
 */
export async function duplicateSchedule(scheduleId: string, actor: Actor): Promise<ExamSchedule> {
  requireAdmin(actor);

  const existing = await prisma.examSchedule.findUnique({
    where: { id: scheduleId },
    include: { set: { include: { vocabularies: true } } },
  });
  if (!existing) throw new ScheduleValidationError("Không tìm thấy lịch kiểm tra.");

  const baseSlug = `${existing.set.slug}-copy`;
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.vocabularySet.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const newSet = await prisma.vocabularySet.create({
    data: {
      title: `${existing.set.title} (Copy)`,
      slug,
      totalQuestions: existing.set.totalQuestions,
      passScore: existing.set.passScore,
      secondsPerQuestion: existing.set.secondsPerQuestion,
      quizDirection: existing.set.quizDirection,
      allowAnswerReview: existing.set.allowAnswerReview,
      showWrongAnswer: existing.set.showWrongAnswer,
      wrongAnswerDisplayMs: existing.set.wrongAnswerDisplayMs,
      isActive: existing.set.isActive,
      vocabularies: {
        create: existing.set.vocabularies.map((v) => ({
          english: v.english,
          vietnamese: v.vietnamese,
          acceptedAnswers: v.acceptedAnswers,
          acceptedAnswersVi: v.acceptedAnswersVi,
        })),
      },
    },
  });

  const schedule = await prisma.examSchedule.create({
    data: {
      setId: newSet.id,
      description: existing.description,
      attemptLimit: existing.attemptLimit,
      openAt: existing.openAt,
      closeAt: existing.closeAt,
      timezone: existing.timezone,
      status: "DRAFT",
      publishedAt: null,
      createdBy: actor.id,
    },
  });

  await prisma.examAuditLog.create({
    data: {
      scheduleId: schedule.id,
      adminId: actor.id,
      action: "duplicated",
      oldValues: toJson({ sourceScheduleId: scheduleId }),
      newValues: toJson({ setId: newSet.id }),
    },
  });

  return schedule;
}

export { ScheduleForbiddenError, ScheduleValidationError };
