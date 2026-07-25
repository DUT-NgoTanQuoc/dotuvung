import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      set: true,
      answers: { include: { vocabulary: true }, orderBy: { orderIndex: "asc" } },
    },
  });
  if (!attempt) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{attempt.studentName}</h1>
          <p className="text-sm text-zinc-500">
            {attempt.set.title} · Nộp lúc {attempt.finishedAt?.toLocaleString("vi-VN") ?? "chưa nộp"}
          </p>
        </div>
        <Badge
          className={
            attempt.isPass
              ? "bg-green-600 text-white hover:bg-green-600"
              : "bg-red-600 text-white hover:bg-red-600"
          }
        >
          {attempt.score}/{attempt.total} · {attempt.isPass ? "PASS" : "FAIL"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chi tiết từng câu ({attempt.duration ?? "-"}s tổng thời gian)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Tiếng Việt</TableHead>
                <TableHead>Đáp án đúng</TableHead>
                <TableHead>Học sinh trả lời</TableHead>
                <TableHead>Kết quả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempt.answers.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.orderIndex + 1}</TableCell>
                  <TableCell>{a.vocabulary.vietnamese}</TableCell>
                  <TableCell className="font-medium">{a.vocabulary.english}</TableCell>
                  <TableCell className="text-zinc-500">
                    {a.timedOut ? (
                      <span className="italic text-amber-600">Hết giờ</span>
                    ) : (
                      a.userAnswer || <span className="italic text-zinc-400">(bỏ trống)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.isCorrect ? (
                      <Badge className="bg-green-600 text-white hover:bg-green-600">Đúng</Badge>
                    ) : (
                      <Badge className="bg-red-600 text-white hover:bg-red-600">Sai</Badge>
                    )}
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
