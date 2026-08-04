import type { ExamStatus } from "@prisma/client";

export interface Actor {
  id: string;
  role: "SUPER_ADMIN" | "TEACHER";
}

/** Minimal shape needed to compute status — matches the ExamSchedule Prisma model. */
export interface ScheduleTimestamps {
  openAt: Date;
  closeAt: Date;
  publishedAt: Date | null;
  archivedAt: Date | null;
}

export interface CreateScheduleInput {
  setId: string;
  description?: string | null;
  attemptLimit?: number | null;
  openAt: Date;
  closeAt: Date;
  timezone: string;
  isDraft: boolean;
}

export interface UpdateScheduleInput {
  description?: string | null;
  attemptLimit?: number | null;
  openAt: Date;
  closeAt: Date;
  timezone: string;
  isDraft: boolean;
}

export interface ScheduleFilters {
  status?: ExamStatus;
  search?: string;
}

export type { ExamStatus };
