import { NextRequest, NextResponse } from "next/server";
import { getScheduleWithComputedStatus } from "@/lib/exam-scheduling/service";

/**
 * Public, unauthenticated: students poll this to react to the schedule
 * opening/closing without a manual refresh. Returns server time so callers
 * never need to trust their own clock (see CountdownText/ExamStatusWatcher).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const now = new Date();
  const result = await getScheduleWithComputedStatus(setId, now);

  if (!result) {
    return NextResponse.json({ status: "OPEN", now: now.toISOString() });
  }

  return NextResponse.json({
    status: result.status,
    now: now.toISOString(),
    openAt: result.schedule.openAt.toISOString(),
    closeAt: result.schedule.closeAt.toISOString(),
  });
}
