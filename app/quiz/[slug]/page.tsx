import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAttemptFromCookie, resolveCurrentQuestion } from "@/lib/quiz/session";
import { QuizRunner } from "@/app/quiz/[slug]/QuizRunner";

export const dynamic = "force-dynamic";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const attempt = await getAttemptFromCookie();

  if (!attempt) {
    redirect("/?e=no-attempt");
  }

  if (attempt.finishedAt) {
    redirect(`/result/${attempt.id}`);
  }

  if (attempt.set.slug !== slug) {
    redirect(`/quiz/${attempt.set.slug}`);
  }

  const set = attempt.set;
  if (!set) notFound();

  const resolved = await prisma.$transaction((tx) => resolveCurrentQuestion(tx, attempt), {
    timeout: 15000,
    maxWait: 10000,
  });

  if (resolved.status === "finished") {
    redirect(`/result/${resolved.attemptId}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center text-xl font-semibold text-zinc-700 dark:text-zinc-300">
          {set.title}
        </h1>
        <QuizRunner
          key={resolved.question.orderIndex}
          initialQuestion={resolved.question}
        />
      </div>
    </div>
  );
}
