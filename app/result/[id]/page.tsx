import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { readAttemptAuth } from "@/lib/quiz/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {attempt.studentName}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{attempt.set.title}</p>

            <div className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {attempt.score}/{attempt.total}
            </div>

            <Badge
              className={
                attempt.isPass
                  ? "bg-green-600 text-white hover:bg-green-600"
                  : "bg-red-600 text-white hover:bg-red-600"
              }
            >
              {attempt.isPass ? "PASS" : "FAIL"}
            </Badge>

            {attempt.duration !== null && (
              <p className="text-xs text-zinc-400">
                Thời gian làm bài: {minutes}p {seconds}s
              </p>
            )}
          </CardContent>
        </Card>

        {wrongWords.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">
                Các từ sai:
              </h2>
              <Separator className="mb-3" />
              <ul className="list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
                {wrongWords.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}
