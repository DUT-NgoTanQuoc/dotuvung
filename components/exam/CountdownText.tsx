"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/exam-scheduling/status";

/**
 * Displays a ticking countdown to `targetIso`. `serverNowIso` is the
 * server's clock at render time — we compute a client/server offset once on
 * mount so the tick never trusts a possibly-wrong browser clock, per "Không
 * sử dụng thời gian trên trình duyệt" (the actual open/close gating is
 * always enforced server-side regardless of what this displays).
 */
export function CountdownText({
  targetIso,
  serverNowIso,
  prefix,
  doneText,
}: {
  targetIso: string;
  serverNowIso: string;
  prefix: string;
  doneText: string;
}) {
  const [offset] = useState(() => new Date(serverNowIso).getTime() - Date.now());
  const [msLeft, setMsLeft] = useState(() => new Date(targetIso).getTime() - (Date.now() + offset));

  useEffect(() => {
    const id = setInterval(() => {
      setMsLeft(new Date(targetIso).getTime() - (Date.now() + offset));
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso, offset]);

  if (msLeft <= 0) return <span>{doneText}</span>;
  return (
    <span>
      {prefix} {formatDuration(msLeft)}
    </span>
  );
}
