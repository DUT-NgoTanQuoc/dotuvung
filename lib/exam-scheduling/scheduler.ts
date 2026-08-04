/**
 * Scheduler Service — pure, controller-free. The cron route
 * (app/api/cron/exam-scheduler/route.ts) is the only caller in production;
 * this file has no Next.js imports so it stays testable in isolation and
 * keeps transition logic out of the route handler, per the "Scheduler
 * Service riêng, không viết logic trong Controller" requirement.
 *
 * This is a best-effort sweep, not the source of truth: every read path in
 * service.ts (list, dashboard, single-schedule lookup) self-heals the same
 * way via selfHealMany, so correctness never depends on this actually
 * firing every minute (Vercel Cron on the Hobby tier collapses to ~daily).
 */
import { prisma } from "@/lib/prisma";
import { selfHealMany } from "@/lib/exam-scheduling/service";

export interface SchedulerRunResult {
  checked: number;
  transitioned: number;
  errors: number;
}

export async function transitionDueExams(now: Date): Promise<SchedulerRunResult> {
  const rows = await prisma.examSchedule.findMany({
    where: { publishedAt: { not: null }, archivedAt: null },
  });

  const { transitioned, errors } = await selfHealMany(rows, now);

  return { checked: rows.length, transitioned, errors };
}
