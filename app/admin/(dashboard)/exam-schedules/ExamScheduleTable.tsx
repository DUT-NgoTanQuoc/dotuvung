"use client";

import { useTransition } from "react";
import type { ExamStatus } from "@prisma/client";
import { MoreHorizontal, CalendarClock, PlayCircle, StopCircle, Copy, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/exam/StatusBadge";
import { CountdownText } from "@/components/exam/CountdownText";
import { EditExamScheduleDialog } from "@/app/admin/(dashboard)/exam-schedules/EditExamScheduleDialog";
import {
  archiveScheduleAction,
  closeNowAction,
  deleteScheduleAction,
  duplicateScheduleAction,
  openNowAction,
} from "@/app/admin/actions/exam-schedule";

export type ScheduleRow = {
  id: string;
  setId: string;
  description: string | null;
  attemptLimit: number | null;
  openAt: Date;
  closeAt: Date;
  timezone: string;
  status: ExamStatus;
  computedStatus: ExamStatus;
  set: { id: string; title: string; slug: string };
};

function fmt(date: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: timezone,
    }).format(date);
  } catch {
    return date.toLocaleString("vi-VN");
  }
}

export function ExamScheduleTable({
  schedules,
  serverNowIso,
}: {
  schedules: ScheduleRow[];
  serverNowIso: string;
}) {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string } | void>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(successMsg);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên bài</TableHead>
            <TableHead>Ngày mở</TableHead>
            <TableHead>Ngày đóng</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Countdown</TableHead>
            <TableHead className="text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedules.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-zinc-400">
                <div className="flex flex-col items-center gap-2">
                  <CalendarClock className="h-8 w-8 text-zinc-300" />
                  Chưa có lịch kiểm tra nào
                </div>
              </TableCell>
            </TableRow>
          )}
          {schedules.map((s, i) => (
            <TableRow
              key={s.id}
              className="animate-in fade-in slide-in-from-bottom-1 duration-300"
              style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, animationFillMode: "backwards" }}
            >
              <TableCell className="font-medium">{s.set.title}</TableCell>
              <TableCell className="text-zinc-500">{fmt(s.openAt, s.timezone)}</TableCell>
              <TableCell className="text-zinc-500">{fmt(s.closeAt, s.timezone)}</TableCell>
              <TableCell>
                <StatusBadge status={s.computedStatus} />
              </TableCell>
              <TableCell className="text-sm text-zinc-500">
                {s.computedStatus === "SCHEDULED" && (
                  <CountdownText
                    targetIso={s.openAt.toISOString()}
                    serverNowIso={serverNowIso}
                    prefix="Mở sau:"
                    doneText="Sắp mở..."
                  />
                )}
                {s.computedStatus === "OPEN" && (
                  <CountdownText
                    targetIso={s.closeAt.toISOString()}
                    serverNowIso={serverNowIso}
                    prefix="Còn lại:"
                    doneText="Sắp đóng..."
                  />
                )}
                {(s.computedStatus === "CLOSED" || s.computedStatus === "ARCHIVED") && "Đã kết thúc"}
                {s.computedStatus === "DRAFT" && "Chưa lên lịch"}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <EditExamScheduleDialog schedule={s} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(s.computedStatus === "DRAFT" || s.computedStatus === "SCHEDULED") && (
                        <DropdownMenuItem
                          onClick={() => run(() => openNowAction(s.id), "Đã mở ngay bài kiểm tra")}
                        >
                          <PlayCircle className="mr-2 h-4 w-4" /> Open Now
                        </DropdownMenuItem>
                      )}
                      {(s.computedStatus === "OPEN" || s.computedStatus === "SCHEDULED") && (
                        <DropdownMenuItem
                          onClick={() => run(() => closeNowAction(s.id), "Đã đóng ngay bài kiểm tra")}
                        >
                          <StopCircle className="mr-2 h-4 w-4" /> Close Now
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => run(() => duplicateScheduleAction(s.id), "Đã tạo bản sao")}
                      >
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      {s.computedStatus !== "ARCHIVED" && (
                        <DropdownMenuItem
                          onClick={() => run(() => archiveScheduleAction(s.id), "Đã lưu trữ")}
                        >
                          <Archive className="mr-2 h-4 w-4" /> Archive
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          if (!confirm(`Xoá lịch kiểm tra của "${s.set.title}"?`)) return;
                          startTransition(async () => {
                            await deleteScheduleAction(s.id);
                            toast.success("Đã xoá lịch kiểm tra");
                          });
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Xoá
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
