import { CalendarClock, CircleDot, Archive, FileClock, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDashboardCounts, getRecentActivity, listSchedulesForAdmin } from "@/lib/exam-scheduling/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CreateExamScheduleDialog } from "@/app/admin/(dashboard)/exam-schedules/CreateExamScheduleDialog";
import { ExamScheduleExplorer } from "@/app/admin/(dashboard)/exam-schedules/ExamScheduleExplorer";

export const dynamic = "force-dynamic";

export default async function ExamSchedulesPage() {
  const now = new Date();
  const [counts, schedules, recentActivity, availableSets] = await Promise.all([
    getDashboardCounts(now),
    listSchedulesForAdmin({}, now),
    getRecentActivity(8),
    prisma.vocabularySet.findMany({
      where: { examSchedule: null },
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const stats = [
    { label: "Đang mở", value: counts.OPEN, icon: CircleDot, color: "text-green-600", iconBg: "bg-green-100 dark:bg-green-950" },
    { label: "Sắp mở", value: counts.SCHEDULED, icon: CalendarClock, color: "text-amber-600", iconBg: "bg-amber-100 dark:bg-amber-950" },
    { label: "Đã đóng", value: counts.CLOSED, icon: XCircle, color: "text-red-600", iconBg: "bg-red-100 dark:bg-red-950" },
    { label: "Draft", value: counts.DRAFT, icon: FileClock, color: "text-zinc-500", iconBg: "bg-zinc-100 dark:bg-zinc-800" },
    { label: "Lưu trữ", value: counts.ARCHIVED, icon: Archive, color: "text-zinc-500", iconBg: "bg-zinc-100 dark:bg-zinc-800" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Lịch thi</h1>
          <p className="text-sm text-zinc-500">Lên lịch mở/đóng bài kiểm tra tự động</p>
        </div>
        <CreateExamScheduleDialog sets={availableSets} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <Card
            key={s.label}
            className="animate-in fade-in zoom-in-95 duration-300"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
          >
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">{s.label}</CardTitle>
              <div className={cn("rounded-full p-1.5", s.iconBg)}>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
            </CardHeader>
            <CardContent className={cn("text-3xl font-bold", s.color)}>{s.value}</CardContent>
          </Card>
        ))}
      </div>

      <ExamScheduleExplorer schedules={schedules} serverNowIso={now.toISOString()} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hoạt động tự động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-400">Chưa có bài nào tự động mở/đóng.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-4">
                  <span>
                    <span className="font-medium">{log.schedule.set.title}</span>{" "}
                    {log.action === "auto_opened" ? "tự động mở" : "tự động đóng"}
                  </span>
                  <span className="text-zinc-400">{log.createdAt.toLocaleString("vi-VN")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
