"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisible poller: while a schedule's status might still change (SCHEDULED
 * waiting to open, or OPEN waiting to close), poll the live status endpoint
 * and force a server-component refresh the moment it flips — this is what
 * makes Scheduled→Open and Open→Closed happen for a student "không cần
 * refresh, không cần bấm nút."
 */
export function ExamStatusWatcher({
  setId,
  initialStatus,
  intervalMs = 20_000,
}: {
  setId: string;
  initialStatus: string;
  intervalMs?: number;
}) {
  const router = useRouter();
  const lastStatus = useRef(initialStatus);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/exam-schedule/${setId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status && data.status !== lastStatus.current) {
          lastStatus.current = data.status;
          router.refresh();
        }
      } catch {
        // Transient network error — try again next tick.
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [setId, intervalMs, router]);

  return null;
}
