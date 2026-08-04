"use client";

import { useMemo, useState } from "react";
import type { ExamStatus } from "@prisma/client";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchInput } from "@/components/search-input";
import { cn } from "@/lib/utils";
import { ExamScheduleTable, type ScheduleRow } from "@/app/admin/(dashboard)/exam-schedules/ExamScheduleTable";
import { ExamCalendarView } from "@/app/admin/(dashboard)/exam-schedules/ExamCalendarView";

const STATUS_FILTERS: { value: ExamStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "DRAFT", label: "Draft" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "ARCHIVED", label: "Archived" },
];

export function ExamScheduleExplorer({
  schedules,
  serverNowIso,
}: {
  schedules: ScheduleRow[];
  serverNowIso: string;
}) {
  const [view, setView] = useState<"table" | "calendar">("table");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ExamStatus | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schedules.filter((s) => {
      if (status !== "ALL" && s.computedStatus !== status) return false;
      if (!q) return true;
      return s.set.title.toLowerCase().includes(q) || s.set.slug.toLowerCase().includes(q);
    });
  }, [schedules, query, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm theo tên bài hoặc bộ từ..."
          className="max-w-sm"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as ExamStatus | "ALL")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("gap-1.5", view === "table" && "bg-primary text-primary-foreground")}
            onClick={() => setView("table")}
          >
            <List className="h-4 w-4" />
            Table
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("gap-1.5", view === "calendar" && "bg-primary text-primary-foreground")}
            onClick={() => setView("calendar")}
          >
            <LayoutGrid className="h-4 w-4" />
            Calendar
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <ExamScheduleTable schedules={filtered} serverNowIso={serverNowIso} />
      ) : (
        <ExamCalendarView schedules={filtered} />
      )}
    </div>
  );
}
