import type { ExamStatus } from "@prisma/client";
import type { ScheduleTimestamps } from "@/lib/exam-scheduling/types";

/**
 * Single source of truth for exam status. Never trust the persisted `status`
 * column for a gating decision — always recompute from timestamps, because
 * the column is only a best-effort cache (kept warm by a cron sweep that may
 * not fire reliably on serverless). Manual Open Now / Close Now work by
 * rewriting openAt/closeAt to `now` rather than adding override flags, so
 * this stays the only branch of logic that decides status.
 */
export function computeStatus(schedule: ScheduleTimestamps, now: Date): ExamStatus {
  if (schedule.archivedAt) return "ARCHIVED";
  if (!schedule.publishedAt) return "DRAFT";
  if (now < schedule.openAt) return "SCHEDULED";
  if (now < schedule.closeAt) return "OPEN";
  return "CLOSED";
}

export interface CountdownInfo {
  status: ExamStatus;
  /** Milliseconds until openAt (only meaningful when status is SCHEDULED). */
  msUntilOpen: number;
  /** Milliseconds until closeAt (only meaningful when status is OPEN). */
  msUntilClose: number;
}

export function computeCountdown(schedule: ScheduleTimestamps, now: Date): CountdownInfo {
  return {
    status: computeStatus(schedule, now),
    msUntilOpen: schedule.openAt.getTime() - now.getTime(),
    msUntilClose: schedule.closeAt.getTime() - now.getTime(),
  };
}

/** Formats a millisecond duration as "Xd Xh" / "Xh Xm" / "Xm", per the spec's countdown examples. */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}
