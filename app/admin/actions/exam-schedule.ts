"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { zonedTimeToUtc, DEFAULT_TIMEZONE } from "@/lib/exam-scheduling/timezone";
import {
  ScheduleForbiddenError,
  ScheduleValidationError,
  archiveSchedule,
  closeNow,
  createSchedule,
  deleteSchedule,
  duplicateSchedule,
  openNow,
  updateSchedule,
} from "@/lib/exam-scheduling/service";
import type { Actor } from "@/lib/exam-scheduling/types";

export type ScheduleFormState = { error?: string; ok?: boolean };

async function getActor(): Promise<Actor> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ScheduleForbiddenError("Bạn cần đăng nhập với quyền Admin.");
  }
  return { id: session.user.id, role: session.user.role };
}

function parseDateTimeField(formData: FormData, field: string, timezone: string): Date | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw || !raw.includes("T")) return null;
  const [datePart, timePart] = raw.split("T");
  if (!datePart || !timePart) return null;
  return zonedTimeToUtc(datePart, timePart, timezone);
}

function revalidateAll() {
  revalidatePath("/admin/exam-schedules");
  revalidatePath("/admin/vocabulary-sets");
  revalidatePath("/admin");
}

export async function createScheduleAction(
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  try {
    const actor = await getActor();
    const timezone = String(formData.get("timezone") ?? DEFAULT_TIMEZONE);
    const setId = String(formData.get("setId") ?? "");
    const isDraft = formData.get("isDraft") === "on";
    const openAt = parseDateTimeField(formData, "openAt", timezone);
    const closeAt = parseDateTimeField(formData, "closeAt", timezone);
    const attemptLimitRaw = String(formData.get("attemptLimit") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    await createSchedule(
      {
        setId,
        description: description || null,
        attemptLimit: attemptLimitRaw ? Number(attemptLimitRaw) : null,
        openAt: openAt ?? new Date(0),
        closeAt: closeAt ?? new Date(0),
        timezone,
        isDraft,
      },
      actor,
      new Date()
    );

    revalidateAll();
    return { ok: true };
  } catch (err) {
    if (err instanceof ScheduleValidationError || err instanceof ScheduleForbiddenError) {
      return { error: err.message };
    }
    console.error("[exam-schedule] createScheduleAction failed:", err);
    return { error: "Đã xảy ra lỗi khi lưu lịch." };
  }
}

export async function updateScheduleAction(
  scheduleId: string,
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  try {
    const actor = await getActor();
    const timezone = String(formData.get("timezone") ?? DEFAULT_TIMEZONE);
    const isDraft = formData.get("isDraft") === "on";
    const openAt = parseDateTimeField(formData, "openAt", timezone);
    const closeAt = parseDateTimeField(formData, "closeAt", timezone);
    const attemptLimitRaw = String(formData.get("attemptLimit") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    await updateSchedule(
      scheduleId,
      {
        description: description || null,
        attemptLimit: attemptLimitRaw ? Number(attemptLimitRaw) : null,
        openAt: openAt ?? new Date(0),
        closeAt: closeAt ?? new Date(0),
        timezone,
        isDraft,
      },
      actor,
      new Date()
    );

    revalidateAll();
    return { ok: true };
  } catch (err) {
    if (err instanceof ScheduleValidationError || err instanceof ScheduleForbiddenError) {
      return { error: err.message };
    }
    console.error("[exam-schedule] updateScheduleAction failed:", err);
    return { error: "Đã xảy ra lỗi khi lưu lịch." };
  }
}

export async function deleteScheduleAction(scheduleId: string): Promise<void> {
  const actor = await getActor();
  await deleteSchedule(scheduleId, actor);
  revalidateAll();
}

export async function openNowAction(scheduleId: string): Promise<{ error?: string }> {
  try {
    const actor = await getActor();
    await openNow(scheduleId, actor, new Date());
    revalidateAll();
    return {};
  } catch (err) {
    if (err instanceof ScheduleValidationError || err instanceof ScheduleForbiddenError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function closeNowAction(scheduleId: string): Promise<{ error?: string }> {
  try {
    const actor = await getActor();
    await closeNow(scheduleId, actor, new Date());
    revalidateAll();
    return {};
  } catch (err) {
    if (err instanceof ScheduleValidationError || err instanceof ScheduleForbiddenError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function archiveScheduleAction(scheduleId: string): Promise<{ error?: string }> {
  try {
    const actor = await getActor();
    await archiveSchedule(scheduleId, actor, new Date());
    revalidateAll();
    return {};
  } catch (err) {
    if (err instanceof ScheduleValidationError || err instanceof ScheduleForbiddenError) {
      return { error: err.message };
    }
    throw err;
  }
}

export async function duplicateScheduleAction(scheduleId: string): Promise<{ error?: string }> {
  try {
    const actor = await getActor();
    await duplicateSchedule(scheduleId, actor);
    revalidateAll();
    return {};
  } catch (err) {
    if (err instanceof ScheduleValidationError || err instanceof ScheduleForbiddenError) {
      return { error: err.message };
    }
    throw err;
  }
}
