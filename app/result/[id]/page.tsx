import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readAttemptAuth } from "@/lib/quiz/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Home, BookX } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

  const wrongWords = attempt.answers
    .filter((a) => !a.isCorrect)
    .map((a) => a.vocabulary.english);

  const minutes = attempt.duration ? Math.floor(attempt.duration / 60) : 0;
  const seconds = attempt.duration ? attempt.duration % 60 : 0;

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
      <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <Card className="overflow-hidden shadow-lg shadow-zinc-200/50 dark:shadow-none">
          <CardContent className="space-y-4 pt-6 text-center">
            <div
              className={cn(
                "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
                attempt.isPass
                  ? "bg-green-100 text-green-600 dark:bg-green-950"
                  : "bg-red-100 text-red-600 dark:bg-red-950"
              )}
            >
              {attempt.isPass ? (
                <CheckCircle2 className="h-9 w-9 animate-in zoom-in duration-500" />
              ) : (
                <XCircle className="h-9 w-9 animate-in zoom-in duration-500" />
              )}
            </div>

            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {attempt.studentName}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{attempt.set.title}</p>

            <div className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {attempt.score}/{attempt.total}
            </div>

            <Badge
              className={cn(
                "px-4 py-1 text-sm",
                attempt.isPass
                  ? "bg-green-600 text-white hover:bg-green-600"
                  : "bg-red-600 text-white hover:bg-red-600"
              )}
            >
              {attempt.isPass ? "PASS" : "FAIL"}
            </Badge>

            {attempt.duration !== null && (
              <p className="flex items-center justify-center gap-1 text-xs text-zinc-400">
                <Clock className="h-3 w-3" />
                Thời gian làm bài: {minutes}p {seconds}s
              </p>
            )}
          </CardContent>
        </Card>

        {wrongWords.length > 0 && (
          <Card
            className="animate-in fade-in slide-in-from-bottom-2 shadow-lg shadow-zinc-200/50 duration-500 dark:shadow-none"
            style={{ animationDelay: "150ms", animationFillMode: "backwards" }}
          >
            <CardContent className="pt-6">
              <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                <BookX className="h-4 w-4 text-red-500" />
                Các từ sai ({wrongWords.length})
              </h2>
              <Separator className="mb-3" />
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-zinc-700 dark:text-zinc-300">
                {wrongWords.map((w, i) => (
                  <li key={i} className="flex items-center gap-1.5 before:text-red-400 before:content-['•']">
                    {w}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button asChild variant="outline" className="w-full gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Về trang chủ
          </Link>
        </Button>
      </div>
    </div>
  );
}
