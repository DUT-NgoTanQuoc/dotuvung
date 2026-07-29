"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, TimerIcon, XCircle } from "lucide-react";
import { submitAnswer, type LastAnswerFeedback } from "@/app/actions/quiz";
import type { CurrentQuestion } from "@/lib/quiz/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function QuizRunner({ initialQuestion }: { initialQuestion: CurrentQuestion }) {
  const router = useRouter();
  const [question, setQuestion] = useState(initialQuestion);
  const [value, setValue] = useState("");
  const [remaining, setRemaining] = useState(initialQuestion.remainingMs);
  const [totalMs, setTotalMs] = useState(initialQuestion.remainingMs);
  const [feedback, setFeedback] = useState<LastAnswerFeedback | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  const lockRef = useRef(false);

  const send = (answer: string) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const orderIndex = question.orderIndex;
    startTransition(async () => {
      const result = await submitAnswer({ orderIndex, answer });
      if (result.status === "error") {
        router.replace("/?e=no-attempt");
        return;
      }

      setFeedback(result.feedback);
      setReviewing(true);
      const delay = result.feedback ? result.feedback.displayMs : 0;

      setTimeout(() => {
        if (result.status === "finished") {
          router.replace(`/result/${result.attemptId}`);
          return;
        }
        setFeedback(null);
        setReviewing(false);
        setValue("");
        setTotalMs(result.question.remainingMs);
        setQuestion(result.question);
        setRemaining(result.question.remainingMs);
        lockRef.current = false;
      }, delay);
    });
  };

  useEffect(() => {
    lockRef.current = false;
    const deadline = performance.now() + question.remainingMs;
    const id = setInterval(() => {
      const left = deadline - performance.now();
      setRemaining(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        send(valueRef.current);
      }
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.orderIndex]);

  const progressPct = ((question.questionNumber - 1) / question.total) * 100;
  const timePct = Math.max(0, Math.min(100, (remaining / totalMs) * 100));
  const secondsLeft = Math.ceil(remaining / 1000);
  const urgent = secondsLeft <= 3;
  const warn = secondsLeft <= 5 && !urgent;

  return (
    <div className="space-y-4">
      <Progress value={progressPct} className="transition-all duration-500" />
      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span>
          Câu <span className="font-semibold text-zinc-900 dark:text-zinc-50">{question.questionNumber}</span>/
          {question.total}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 font-semibold transition-colors",
            urgent && "animate-pulse text-red-600",
            warn && "text-amber-500"
          )}
        >
          <TimerIcon className="h-3.5 w-3.5" />
          {secondsLeft}s
        </span>
      </div>
      <Progress
        value={timePct}
        className={cn(
          "h-1.5 transition-all duration-100 [&>div]:transition-colors",
          urgent ? "[&>div]:bg-red-600" : warn ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"
        )}
      />

      <Card
        key={question.orderIndex}
        className="animate-in fade-in slide-in-from-right-2 shadow-lg shadow-zinc-200/50 duration-300 dark:shadow-none"
      >
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(value);
            }}
            className="space-y-5"
          >
            <p className="text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {question.prompt}
            </p>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                question.direction === "en_vi" ? "Nhập nghĩa tiếng Việt..." : "Nhập từ tiếng Anh..."
              }
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isPending || reviewing}
              className={cn(
                "text-center text-lg transition-shadow focus-visible:shadow-md",
                feedback && !feedback.wasCorrect && "border-red-400 focus-visible:ring-red-400/50"
              )}
            />
            {feedback && (
              <div
                className={cn(
                  "animate-in fade-in zoom-in-95 slide-in-from-top-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium duration-300",
                  feedback.wasCorrect
                    ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                )}
              >
                {feedback.wasCorrect ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {feedback.wasCorrect
                    ? "Chính xác!"
                    : feedback.correctAnswer
                      ? feedback.wasTimeout
                        ? `Hết thời gian! Đáp án đúng: ${feedback.correctAnswer}`
                        : `Sai rồi! Đáp án đúng: ${feedback.correctAnswer}`
                      : feedback.wasTimeout
                        ? "Hết thời gian!"
                        : "Sai rồi!"}
                </span>
              </div>
            )}
            <Button
              type="submit"
              className="w-full gap-2 transition-transform active:scale-[0.98]"
              size="lg"
              disabled={isPending || reviewing}
            >
              {isPending || reviewing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Tiếp tục
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
