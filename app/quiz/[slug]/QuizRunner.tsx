"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAnswer } from "@/app/actions/quiz";
import type { CurrentQuestion } from "@/lib/quiz/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

export function QuizRunner({ initialQuestion }: { initialQuestion: CurrentQuestion }) {
  const router = useRouter();
  const [question, setQuestion] = useState(initialQuestion);
  const [value, setValue] = useState("");
  const [remaining, setRemaining] = useState(initialQuestion.remainingMs);
  const [totalMs, setTotalMs] = useState(initialQuestion.remainingMs);
  const [timeoutFlash, setTimeoutFlash] = useState(false);
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
      if (result.status === "finished") {
        router.replace(`/result/${result.attemptId}`);
        return;
      }
      if (result.status === "error") {
        router.replace("/?e=no-attempt");
        return;
      }
      setTimeoutFlash(result.lastWasTimeout);
      setValue("");
      setTotalMs(result.question.remainingMs);
      setQuestion(result.question);
      setRemaining(result.question.remainingMs);
      lockRef.current = false;
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

  useEffect(() => {
    if (!timeoutFlash) return;
    const t = setTimeout(() => setTimeoutFlash(false), 1500);
    return () => clearTimeout(t);
  }, [timeoutFlash]);

  const progressPct = ((question.questionNumber - 1) / question.total) * 100;
  const timePct = Math.max(0, Math.min(100, (remaining / totalMs) * 100));
  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <div className="space-y-4">
      <Progress value={progressPct} />
      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span>
          Câu {question.questionNumber}/{question.total}
        </span>
        <span className={secondsLeft <= 3 ? "font-bold text-red-600" : ""}>
          {secondsLeft}s
        </span>
      </div>
      <Progress
        value={timePct}
        className={secondsLeft <= 3 ? "[&>div]:bg-red-600" : ""}
      />

      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(value);
            }}
            className="space-y-5"
          >
            <p className="text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {question.vietnamese}
            </p>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Nhập từ tiếng Anh..."
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              disabled={isPending}
            />
            {timeoutFlash && (
              <p className="text-center text-sm font-medium text-red-600">
                Hết thời gian!
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" disabled={isPending}>
              Tiếp tục
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
