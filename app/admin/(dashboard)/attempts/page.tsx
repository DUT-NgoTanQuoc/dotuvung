import Link from "next/link";
import { prisma } from "@/lib/prisma";
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

export default async function AttemptsPage() {
  const attempts = await prisma.attempt.findMany({
    where: { finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    include: { set: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lịch sử làm bài</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
            <TableHead>Bộ từ</TableHead>
            <TableHead>Điểm</TableHead>
            <TableHead>Kết quả</TableHead>
            <TableHead>Thời gian làm</TableHead>
            <TableHead>Nộp lúc</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-zinc-400">
                Chưa có lượt làm bài nào
              </TableCell>
            </TableRow>
          )}
          {attempts.map((a) => (
            <TableRow key={a.id}>
              <TableCell>
                <Link
                  href={`/admin/attempts/${a.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {a.studentName}
                </Link>
              </TableCell>
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
              <TableCell>{a.duration ?? "-"}s</TableCell>
              <TableCell className="text-zinc-500">
                {a.finishedAt?.toLocaleString("vi-VN")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
