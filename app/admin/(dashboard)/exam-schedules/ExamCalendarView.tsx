"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ScheduleRow } from "@/app/admin/(dashboard)/exam-schedules/ExamScheduleTable";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ExamCalendarView({ schedules }: { schedules: ScheduleRow[] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const today = new Date();

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold">
          Tháng {cursor.getMonth() + 1}/{cursor.getFullYear()}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (!day) return <div key={i} className="min-h-24 rounded-lg bg-zinc-50 dark:bg-zinc-900/40" />;

          const opens = schedules.filter((s) => sameDay(s.openAt, day));
          const closes = schedules.filter((s) => sameDay(s.closeAt, day) && !sameDay(s.openAt, day));

          return (
            <div
              key={i}
              className={cn(
                "min-h-24 rounded-lg border border-zinc-200 p-1.5 text-left dark:border-zinc-800",
                sameDay(day, today) && "border-primary bg-primary/5"
              )}
            >
              <div className="text-xs font-semibold text-zinc-500">{day.getDate()}</div>
              <div className="mt-1 space-y-0.5">
                {opens.map((s) => (
                  <div
                    key={`open-${s.id}`}
                    className="truncate rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-800 dark:bg-green-950 dark:text-green-300"
                    title={`Mở: ${s.set.title}`}
                  >
                    Mở: {s.set.title}
                  </div>
                ))}
                {closes.map((s) => (
                  <div
                    key={`close-${s.id}`}
                    className="truncate rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-800 dark:bg-red-950 dark:text-red-300"
                    title={`Đóng: ${s.set.title}`}
                  >
                    Đóng: {s.set.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
