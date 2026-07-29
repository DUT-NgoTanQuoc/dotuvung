import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAttemptFromCookie, resolveCurrentQuestion } from "@/lib/quiz/session";
import { QuizRunner } from "@/app/quiz/[slug]/QuizRunner";
import { BackgroundEffects } from "@/app/BackgroundEffects";

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
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-10 sm:px-6">
      <BackgroundEffects />
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center font-display text-xl font-semibold text-[#334155]">
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
