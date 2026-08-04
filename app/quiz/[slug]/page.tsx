import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { finishAttempt, getAttemptFromCookie, resolveCurrentQuestion } from "@/lib/quiz/session";
import { computeStatus } from "@/lib/exam-scheduling/status";
import { QuizRunner } from "@/app/quiz/[slug]/QuizRunner";
import { BackgroundEffects } from "@/app/BackgroundEffects";
import { CountdownText } from "@/components/exam/CountdownText";
import { ExamStatusWatcher } from "@/components/exam/ExamStatusWatcher";
import { Button } from "@/components/ui/button";

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

  const now = new Date();
  const schedule = set.examSchedule;
  const status = schedule ? computeStatus(schedule, now) : "OPEN";

  if (schedule && (status === "DRAFT" || status === "SCHEDULED")) {
    return (
      <BlockedScreen title={set.title}>
        <p>Bài kiểm tra chưa đến thời gian mở.</p>
        <ExamStatusWatcher setId={set.id} initialStatus={status} />
        <p className="text-sm text-[#64748B]">
          <CountdownText
            targetIso={schedule.openAt.toISOString()}
            serverNowIso={now.toISOString()}
            prefix="Mở sau:"
            doneText="Sắp mở..."
          />
        </p>
      </BlockedScreen>
    );
  }

  if (schedule && (status === "CLOSED" || status === "ARCHIVED")) {
    if (!attempt.finishedAt) {
      await finishAttempt(prisma, attempt.id);
    }
    return (
      <BlockedScreen title={set.title}>
        <p>Bài kiểm tra đã kết thúc.</p>
        <Button asChild className="mt-2">
          <a href={`/result/${attempt.id}`}>Xem kết quả</a>
        </Button>
      </BlockedScreen>
    );
  }

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

function BlockedScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-center sm:px-6">
      <BackgroundEffects />
      <div className="w-full max-w-md space-y-4">
        <h1 className="font-display text-xl font-semibold text-[#334155]">{title}</h1>
        <div className="space-y-3 rounded-[24px] border border-white/70 bg-white p-8 text-[#334155] shadow-[0_16px_40px_-12px_rgba(176,197,246,0.45)]">
          {children}
        </div>
      </div>
    </div>
  );
}
