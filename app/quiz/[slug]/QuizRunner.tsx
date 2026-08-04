"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, TimerIcon, XCircle } from "lucide-react";
import { submitAnswer, type LastAnswerFeedback } from "@/app/actions/quiz";
import type { CurrentQuestion } from "@/lib/quiz/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CONFETTI_COLORS = ["#B0C5F6", "#F6EEBF", "#A7C7E7", "#94A3B8"];

function MiniConfetti() {
  const pieces = Array.from({ length: 14 }, (_, i) => ({
    key: i,
    left: (i * 37) % 100,
    delay: (i % 5) * 0.05,
    duration: 0.9 + (i % 4) * 0.15,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + (i % 3) * 2,
  }));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.key}
          className="confetti-piece absolute top-0 rounded-full"
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

function formatClock(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (result.status === "closed") {
        router.refresh();
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
    inputRef.current?.focus();
  }, [question.orderIndex]);

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
  const urgent = secondsLeft <= 5;

  const showCorrectPop = feedback?.wasCorrect;
  const showWrongShake = feedback && !feedback.wasCorrect;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-medium text-[#64748B]">
        <span>
          Từ <span className="font-semibold text-[#334155]">{question.questionNumber}</span>/
          {question.total}
        </span>
        <motion.span
          animate={urgent ? { scale: [1, 1.06, 1] } : {}}
          transition={{ duration: 0.5, repeat: urgent ? Infinity : 0 }}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200 ease-in-out",
            urgent ? "bg-[#F6EEBF] text-[#334155]" : "bg-[#B0C5F6] text-[#334155]"
          )}
        >
          <TimerIcon className="h-3.5 w-3.5" />
          {formatClock(remaining)}
        </motion.span>
      </div>

      <Progress value={progressPct} className="h-2 bg-[#E2E8F0] transition-all duration-500 [&>div]:bg-[#B0C5F6]" />

      <Progress
        value={timePct}
        className={cn(
          "h-1.5 bg-[#E2E8F0] transition-all duration-100",
          urgent ? "[&>div]:bg-[#F6EEBF]" : "[&>div]:bg-[#B0C5F6]"
        )}
      />

      <motion.div
        key={question.orderIndex}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn("relative", showWrongShake && "shake-card")}
      >
        {showCorrectPop && <MiniConfetti />}

        <Card className="rounded-[24px] border border-white/70 bg-white shadow-[0_16px_40px_-12px_rgba(176,197,246,0.45)]">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(value);
              }}
              className="space-y-5"
            >
              <p className="text-center font-display text-[42px] leading-tight font-bold text-[#334155]">
                {question.prompt}
              </p>
              <Input
                ref={inputRef}
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
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                disabled={isPending || reviewing}
                className={cn(
                  "h-16 rounded-2xl border-transparent bg-[#F8FAFF] text-center text-2xl font-semibold text-[#334155] transition-all duration-200 ease-in-out focus-visible:border-[#B0C5F6] focus-visible:shadow-[0_0_20px_rgba(176,197,246,0.4)] focus-visible:ring-0",
                  feedback && !feedback.wasCorrect && "border-red-300 bg-red-50"
                )}
              />
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium",
                      feedback.wasCorrect ? "bg-[#EAF1FF] text-[#334155]" : "bg-red-50 text-red-600"
                    )}
                  >
                    {feedback.wasCorrect ? (
                      <CheckCircle2 className="check-pop h-4 w-4 shrink-0 text-[#6E8CDB]" />
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
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                type="submit"
                className="h-12 w-full gap-2 rounded-2xl bg-[#B0C5F6] text-[#334155] transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
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
      </motion.div>
    </div>
  );
}
