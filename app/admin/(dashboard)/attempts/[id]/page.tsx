import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, X, Clock } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/admin/attempts"
          className="mb-2 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Lịch sử làm bài
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{attempt.studentName}</h1>
            <p className="text-sm text-zinc-500">
              {attempt.set.title} · Nộp lúc{" "}
              {attempt.finishedAt?.toLocaleString("vi-VN") ?? "chưa nộp"}
            </p>
          </div>
          <Badge
            className={cn(
              "px-3 py-1 text-sm",
              attempt.isPass
                ? "bg-green-600 text-white hover:bg-green-600"
                : "bg-red-600 text-white hover:bg-red-600"
            )}
          >
            {attempt.score}/{attempt.total} · {attempt.isPass ? "PASS" : "FAIL"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            Chi tiết từng câu ({attempt.duration ?? "-"}s tổng thời gian)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Câu hỏi</TableHead>
                  <TableHead>Đáp án đúng</TableHead>
                  <TableHead>Học sinh trả lời</TableHead>
                  <TableHead>Kết quả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempt.answers.map((a, i) => {
                  const isEnVi = a.direction === "en_vi";
                  const prompt = isEnVi ? a.vocabulary.english : a.vocabulary.vietnamese;
                  const correctAnswer = isEnVi ? a.vocabulary.vietnamese : a.vocabulary.english;
                  return (
                  <TableRow
                    key={a.id}
                    className={cn(
                      "animate-in fade-in slide-in-from-bottom-1 duration-200",
                      !a.isCorrect && "bg-red-50/50 dark:bg-red-950/20"
                    )}
                    style={{ animationDelay: `${Math.min(i, 15) * 20}ms`, animationFillMode: "backwards" }}
                  >
                    <TableCell className="text-zinc-400">{a.orderIndex + 1}</TableCell>
                    <TableCell>{prompt}</TableCell>
                    <TableCell className="font-medium">{correctAnswer}</TableCell>
                    <TableCell className="text-zinc-500">
                      {a.timedOut ? (
                        <span className="italic text-amber-600">Hết giờ</span>
                      ) : (
                        a.userAnswer || <span className="italic text-zinc-400">(bỏ trống)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.isCorrect ? (
                        <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
                          <Check className="h-3 w-3" /> Đúng
                        </Badge>
                      ) : (
                        <Badge className="gap-1 bg-red-600 text-white hover:bg-red-600">
                          <X className="h-3 w-3" /> Sai
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
