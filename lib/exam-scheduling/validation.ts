import { z } from "zod";
import { isValidTimeZone } from "@/lib/exam-scheduling/timezone";

export const scheduleFormSchema = z
  .object({
    setId: z.string().min(1, "Vui lòng chọn bộ từ vựng."),
    description: z.string().trim().max(2000).optional().nullable(),
    attemptLimit: z
      .number()
      .int()
      .positive("Số lần được làm phải là số nguyên dương.")
      .optional()
      .nullable(),
    openAt: z.date({ error: "Ngày mở không được để trống." }),
    closeAt: z.date({ error: "Ngày đóng không được để trống." }),
    timezone: z
      .string()
      .min(1, "Vui lòng chọn timezone.")
      .refine(isValidTimeZone, "Timezone không hợp lệ."),
    isDraft: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.isDraft) return;
    if (data.openAt.getTime() >= data.closeAt.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "Ngày mở không được sau ngày đóng.",
        path: ["closeAt"],
      });
    }
  });

/** Extra rule only enforced for brand-new (non-draft) schedules — edits to an
 * already-CLOSED schedule are allowed to keep a closeAt in the past. */
export function validateCloseNotInPast(closeAt: Date, now: Date): string | null {
  if (closeAt.getTime() < now.getTime()) {
    return "Ngày đóng không được nhỏ hơn hiện tại.";
  }
  return null;
}

export type ScheduleFormInput = z.infer<typeof scheduleFormSchema>;

export class ScheduleValidationError extends Error {}
export class ScheduleForbiddenError extends Error {}

/**
 * Runs the zod schema plus the "closeAt >= now" rule (skipped for drafts and
 * for edits to schedules that are already CLOSED, since re-saving history is
 * legitimate for SUPER_ADMIN). Throws ScheduleValidationError with a
 * Vietnamese message on the first failure, matching lib/theme/service.ts.
 */
export function validateScheduleInput(
  raw: unknown,
  now: Date,
  opts: { skipPastCheck?: boolean } = {}
): ScheduleFormInput {
  const parsed = scheduleFormSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ScheduleValidationError(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }
  if (!parsed.data.isDraft && !opts.skipPastCheck) {
    const err = validateCloseNotInPast(parsed.data.closeAt, now);
    if (err) throw new ScheduleValidationError(err);
  }
  return parsed.data;
}
