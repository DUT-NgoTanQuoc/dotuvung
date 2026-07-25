import { prisma } from "@/lib/prisma";
import { ClipboardList, CheckCircle2, XCircle, BookOpenCheck, Trophy, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANK_STYLES = [
  "bg-amber-400 text-amber-950",
  "bg-zinc-300 text-zinc-800",
  "bg-orange-400 text-orange-950",
];

export default async function AdminDashboard() {
  const [total, passCount, activeSets, topStudents] = await Promise.all([
    prisma.attempt.count({ where: { finishedAt: { not: null } } }),
    prisma.attempt.count({ where: { finishedAt: { not: null }, isPass: true } }),
    prisma.vocabularySet.findMany({ where: { isActive: true }, select: { title: true } }),
    prisma.attempt.findMany({
      where: { finishedAt: { not: null } },
      orderBy: [{ score: "desc" }, { duration: "asc" }],
      take: 10,
      include: { set: true },
    }),
  ]);

  const failCount = total - passCount;

  const stats = [
    {
      label: "Tổng lượt làm bài",
      value: total,
      icon: ClipboardList,
      color: "text-zinc-500",
      iconBg: "bg-zinc-100 dark:bg-zinc-800",
    },
    {
      label: "PASS",
      value: passCount,
      icon: CheckCircle2,
      color: "text-green-600",
      iconBg: "bg-green-100 dark:bg-green-950",
    },
    {
      label: "FAIL",
      value: failCount,
      icon: XCircle,
      color: "text-red-600",
      iconBg: "bg-red-100 dark:bg-red-950",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-500">Tổng quan hoạt động của hệ thống</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <Card
          className="animate-in fade-in zoom-in-95 duration-300"
          style={{ animationDelay: "180ms", animationFillMode: "backwards" }}
        >
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">Bộ từ đang active</CardTitle>
            <div className="rounded-full bg-blue-100 p-1.5 dark:bg-blue-950">
              <BookOpenCheck className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeSets.length}</div>
            <p className="mt-1 truncate text-xs text-zinc-400">
              {activeSets.map((s) => s.title).join(", ") || "Chưa có"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top 10 học sinh điểm cao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Bộ từ</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead>Kết quả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-zinc-400">
                    <div className="flex flex-col items-center gap-2">
                      <Medal className="h-8 w-8 text-zinc-300" />
                      Chưa có dữ liệu
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {topStudents.map((a, i) => (
                <TableRow
                  key={a.id}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
                >
                  <TableCell>
                    {i < 3 ? (
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          RANK_STYLES[i]
                        )}
                      >
                        {i + 1}
                      </span>
                    ) : (
                      <span className="pl-2 text-zinc-400">{i + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{a.studentName}</TableCell>
                  <TableCell>{a.set.title}</TableCell>
                  <TableCell>
                    {a.score}/{a.total}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        a.isPass
                          ? "bg-green-600 text-white hover:bg-green-600"
                          : "bg-red-600 text-white hover:bg-red-600"
                      }
                    >
                      {a.isPass ? "PASS" : "FAIL"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
