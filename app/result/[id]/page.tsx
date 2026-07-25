import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readAttemptAuth } from "@/lib/quiz/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, XCircle, Clock, Home, BookX, RotateCcw, Check, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CONFETTI_COLORS = ["#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#a855f7"];

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const duration = 1.6 + Math.random() * 1.2;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const size = 6 + Math.random() * 5;
    const rounded = i % 2 === 0;
    return { left, delay, duration, color, size, rounded, key: i };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.key}
          className={cn("confetti-piece absolute top-0", p.rounded ? "rounded-full" : "rounded-[2px]")}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      set: true,
      answers: {
        include: { vocabulary: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!attempt) notFound();

  if (!attempt.finishedAt) {
    // In-progress attempt: only the owning browser (matching cookie) may peek at it.
    const auth = await readAttemptAuth();
    if (!auth || auth.id !== attempt.id || auth.token !== attempt.sessionToken) {
      notFound();
    }
  }

  const minutes = attempt.duration ? Math.floor(attempt.duration / 60) : 0;
  const seconds = attempt.duration ? attempt.duration % 60 : 0;
  const wrongCount = attempt.total - attempt.score;
  const percent = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
  const retryHref = `/?retrySlug=${encodeURIComponent(attempt.set.slug)}&retryName=${encodeURIComponent(attempt.studentName)}`;

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-zinc-50 px-4 py-12 dark:bg-black">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,var(--glow),transparent_60%)]",
          attempt.isPass
            ? "[--glow:theme(colors.green.100)] dark:[--glow:theme(colors.green.950/40)]"
            : "[--glow:theme(colors.red.100)] dark:[--glow:theme(colors.red.950/30)]"
        )}
      />
      <div className="relative w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-500">
        {attempt.isPass && <Confetti />}
        <Card className="relative overflow-hidden shadow-lg shadow-zinc-200/50 dark:shadow-none">
          <CardContent className="space-y-4 pt-6 text-center">
            <div
              className={cn(
                "pass-glow-ring mx-auto flex items-center justify-center rounded-full",
                attempt.isPass
                  ? "pass-badge-pop h-20 w-20 bg-gradient-to-br from-primary to-green-500 text-white shadow-xl shadow-primary/30"
                  : "h-16 w-16 bg-red-100 text-red-600 dark:bg-red-950"
              )}
            >
              {attempt.isPass ? (
                <Trophy className="h-10 w-10" />
              ) : (
                <XCircle className="h-9 w-9 animate-in zoom-in duration-500" />
              )}
            </div>

            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {attempt.studentName}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{attempt.set.title}</p>

            {attempt.isPass && (
              <p className="animate-in fade-in slide-in-from-bottom-1 text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-500 duration-500">
                Xuất sắc! 🎉
              </p>
            )}

            <div className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {attempt.score}/{attempt.total}
            </div>

            <Badge
              className={cn(
                "px-4 py-1 text-sm",
                attempt.isPass
                  ? "bg-gradient-to-r from-primary to-green-500 text-white hover:from-primary hover:to-green-500"
                  : "bg-red-600 text-white hover:bg-red-600"
              )}
            >
              {attempt.isPass ? "PASS" : "FAIL"}
            </Badge>

            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="flex items-center gap-1 font-medium text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đúng: {attempt.score}
              </span>
              <span className="flex items-center gap-1 font-medium text-red-600">
                <XCircle className="h-3.5 w-3.5" />
                Sai: {wrongCount}
              </span>
              <span className="font-medium text-primary">
                Điểm: {percent}%
              </span>
            </div>

            {attempt.duration !== null && (
              <p className="flex items-center justify-center gap-1 text-xs text-zinc-400">
                <Clock className="h-3 w-3" />
                Thời gian làm bài: {minutes}p {seconds}s
              </p>
            )}
          </CardContent>
        </Card>

        {attempt.set.allowAnswerReview && (
          <Card
            className="animate-in fade-in slide-in-from-bottom-2 shadow-lg shadow-zinc-200/50 duration-500 dark:shadow-none"
            style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
          >
            <CardContent className="pt-6">
              <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                <BookX className="h-4 w-4 text-red-500" />
                Chi tiết từng câu
              </h2>
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Câu hỏi</TableHead>
                      <TableHead>Đáp án đúng</TableHead>
                      <TableHead>Bạn trả lời</TableHead>
                      <TableHead className="w-16">Kết quả</TableHead>
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
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-600" />
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
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Trang chủ
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link href={retryHref}>
              <RotateCcw className="h-4 w-4" />
              Làm lại
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
