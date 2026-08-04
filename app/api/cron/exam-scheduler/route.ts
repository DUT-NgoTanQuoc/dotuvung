import { NextRequest, NextResponse } from "next/server";
import { transitionDueExams } from "@/lib/exam-scheduling/scheduler";

/**
 * Invoked by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}` on cron-triggered requests — verify
 * it so this route can't be hit by anyone else to spam audit logs.
 * On the Hobby plan this may only actually fire ~once/day; the lazy
 * self-heal in lib/exam-scheduling/service.ts (used by every admin/student
 * read) is what guarantees correctness regardless of cron cadence.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await transitionDueExams(new Date());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[exam-scheduler cron] sweep failed:", err);
    return NextResponse.json({ ok: false, error: "sweep_failed" }, { status: 500 });
  }
}
