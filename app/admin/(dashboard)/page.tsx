import { prisma } from "@/lib/prisma";
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

export const dynamic = "force-dynamic";

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

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              Tổng lượt làm bài
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">PASS</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-green-600">{passCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">FAIL</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold text-red-600">{failCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              Bộ từ đang active
            </CardTitle>
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
          <CardTitle>Top 10 học sinh điểm cao</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Bộ từ</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead>Kết quả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-zinc-400">
                    Chưa có dữ liệu
                  </TableCell>
                </TableRow>
              )}
              {topStudents.map((a, i) => (
                <TableRow key={a.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{a.studentName}</TableCell>
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
