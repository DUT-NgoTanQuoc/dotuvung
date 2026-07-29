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
import { BackgroundEffects } from "@/app/BackgroundEffects";

export const dynamic = "force-dynamic";

const CONFETTI_COLORS = ["#B0C5F6", "#F6EEBF", "#A7C7E7", "#94A3B8"];

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

  const tierMessage =
    percent >= 90 ? "Xuất sắc!" : percent >= 70 ? "Rất tốt!" : percent >= 50 ? "Cố gắng thêm nhé!" : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-12">
      <BackgroundEffects />
      <div className="relative w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-500">
        {attempt.isPass && <Confetti />}
        <Card className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-[0_20px_50px_-15px_rgba(176,197,246,0.5)]">
          <CardContent className="space-y-4 pt-6 text-center">
            <div
              className={cn(
                "pass-glow-ring mx-auto flex items-center justify-center rounded-full",
                attempt.isPass
                  ? "pass-badge-pop h-20 w-20 bg-[#B0C5F6] text-[#334155] shadow-xl shadow-[#B0C5F6]/40"
                  : "h-16 w-16 bg-red-50 text-red-500"
              )}
            >
              {attempt.isPass ? (
                <Trophy className="h-10 w-10" />
              ) : (
                <XCircle className="h-9 w-9 animate-in zoom-in duration-500" />
              )}
            </div>

            <h1 className="font-display text-2xl font-bold text-[#334155]">🎉 Hoàn thành!</h1>
            <p className="text-sm text-[#64748B]">
              {attempt.studentName} · {attempt.set.title}
            </p>

            {tierMessage && (
              <p className="animate-in fade-in slide-in-from-bottom-1 text-lg font-bold text-[#334155] duration-500">
                {tierMessage}
              </p>
            )}

            <div className="font-display text-5xl font-extrabold text-[#334155]">
              {attempt.score}/{attempt.total}
            </div>

            <Badge
              className={cn(
                "px-4 py-1 text-sm",
                attempt.isPass
                  ? "bg-[#B0C5F6] text-[#334155] hover:bg-[#B0C5F6]"
                  : "bg-red-500 text-white hover:bg-red-500"
              )}
            >
              {percent}%
            </Badge>

            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đúng: {attempt.score}
              </span>
              <span className="flex items-center gap-1 font-medium text-red-500">
                <XCircle className="h-3.5 w-3.5" />
                Sai: {wrongCount}
              </span>
            </div>

            {attempt.duration !== null && (
              <p className="flex items-center justify-center gap-1 text-xs text-[#94A3B8]">
                <Clock className="h-3 w-3" />
                Thời gian làm bài: {minutes}p {seconds}s
              </p>
            )}
          </CardContent>
        </Card>

        {attempt.set.allowAnswerReview && (
          <Card
            className="animate-in fade-in slide-in-from-bottom-2 rounded-[24px] border border-white/70 bg-white shadow-[0_16px_40px_-12px_rgba(176,197,246,0.4)] duration-500"
            style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
          >
            <CardContent className="pt-6">
              <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-[#334155]">
                <BookX className="h-4 w-4 text-red-400" />
                Chi tiết từng câu
              </h2>
              <div className="overflow-hidden rounded-2xl border border-[#E2E8F0]">
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
                            !a.isCorrect && "bg-red-50/50"
                          )}
                          style={{ animationDelay: `${Math.min(i, 15) * 20}ms`, animationFillMode: "backwards" }}
                        >
                          <TableCell className="text-[#94A3B8]">{a.orderIndex + 1}</TableCell>
                          <TableCell>{prompt}</TableCell>
                          <TableCell className="font-medium">{correctAnswer}</TableCell>
                          <TableCell className="text-[#64748B]">
                            {a.timedOut ? (
                              <span className="italic text-amber-600">Hết giờ</span>
                            ) : (
                              a.userAnswer || <span className="italic text-[#94A3B8]">(bỏ trống)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {a.isCorrect ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
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
          <Button
            asChild
            variant="outline"
            className="h-12 gap-2 rounded-2xl border-[#E2E8F0] text-[#334155] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-[#F8FAFF]"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Trang chủ
            </Link>
          </Button>
          <Button
            asChild
            className="h-12 gap-2 rounded-2xl bg-[#B0C5F6] text-[#334155] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-[#B0C5F6] hover:shadow-lg active:scale-[0.98]"
          >
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
