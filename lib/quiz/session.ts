import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

/** Extra tolerance (ms) for network latency before a late submit is marked timed out. */
export const GRACE_MS = 1000;

export const ATTEMPT_COOKIE = "dv_attempt";

type TxClient = Prisma.TransactionClient | PrismaClient;

function normalize(input: string): string {
  return input.trim().replace(/\s+/g, " ").normalize("NFC").toLowerCase();
}

export function isAnswerCorrect(
  userAnswer: string,
  correct: string,
  acceptedAnswers: string[]
): boolean {
  const want = [correct, ...acceptedAnswers].map(normalize);
  return want.includes(normalize(userAnswer));
}

export type QuizDirection = "vi_en" | "en_vi";

function pickDirection(quizDirection: string): QuizDirection {
  if (quizDirection === "en_vi") return "en_vi";
  if (quizDirection === "mixed") return Math.random() < 0.5 ? "en_vi" : "vi_en";
  return "vi_en";
}

/** The text the student must type to be marked correct, given the served direction. */
export function expectedAnswer(
  vocabulary: { english: string; vietnamese: string; acceptedAnswers: string[]; acceptedAnswersVi: string[] },
  direction: QuizDirection
): { correct: string; accepted: string[] } {
  return direction === "en_vi"
    ? { correct: vocabulary.vietnamese, accepted: vocabulary.acceptedAnswersVi }
    : { correct: vocabulary.english, accepted: vocabulary.acceptedAnswers };
}

/** Shuffle in place (Fisher–Yates). Does not use Math.random alternatives — fine for a quiz, not crypto. */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function readAttemptAuth(): Promise<{ id: string; token: string } | null> {
  const jar = await cookies();
  const raw = jar.get(ATTEMPT_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.indexOf(".");
  if (idx < 0) return null;
  const id = raw.slice(0, idx);
  const token = raw.slice(idx + 1);
  if (!id || !token) return null;
  return { id, token };
}

export async function setAttemptCookie(attemptId: string, sessionToken: string) {
  const jar = await cookies();
  jar.set(ATTEMPT_COOKIE, `${attemptId}.${sessionToken}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 hours
  });
}

export type CurrentQuestion = {
  answerId: string;
  orderIndex: number;
  questionNumber: number;
  total: number;
  prompt: string;
  direction: QuizDirection;
  remainingMs: number;
};

export type ResolveResult =
  | { status: "question"; question: CurrentQuestion }
  | { status: "finished"; attemptId: string };

/**
 * The core sweep loop: finds the first unanswered question for this attempt.
 * - If it has never been served, sets served_at/deadline_at (starts its clock) and returns it fresh.
 * - If its deadline has passed, marks it as a timed-out wrong answer and loops to the next one.
 * - If none remain, finishes the attempt (idempotent) and reports "finished".
 * Must run inside a transaction from the caller.
 */
export async function resolveCurrentQuestion(
  tx: TxClient,
  attempt: {
    id: string;
    total: number;
    setId: string;
    set?: { secondsPerQuestion: number; quizDirection: string };
  }
): Promise<ResolveResult> {
  const set =
    attempt.set ?? (await tx.vocabularySet.findUniqueOrThrow({ where: { id: attempt.setId } }));
  const questionMs = set.secondsPerQuestion * 1000;

  // Bounded loop: at most `total` iterations since each pass either returns or expires one row.
  for (let i = 0; i < attempt.total + 1; i++) {
    const row = await tx.attemptAnswer.findFirst({
      where: { attemptId: attempt.id, answeredAt: null },
      orderBy: { orderIndex: "asc" },
      include: { vocabulary: true },
    });

    if (!row) {
      await finishAttempt(tx, attempt.id);
      return { status: "finished", attemptId: attempt.id };
    }

    const now = new Date();

    if (!row.deadlineAt) {
      const deadlineAt = new Date(now.getTime() + questionMs);
      const direction = pickDirection(set.quizDirection);
      await tx.attemptAnswer.updateMany({
        where: { id: row.id, deadlineAt: null },
        data: { servedAt: now, deadlineAt, direction },
      });
      return {
        status: "question",
        question: {
          answerId: row.id,
          orderIndex: row.orderIndex,
          questionNumber: row.orderIndex + 1,
          total: attempt.total,
          prompt: direction === "en_vi" ? row.vocabulary.english : row.vocabulary.vietnamese,
          direction,
          remainingMs: questionMs,
        },
      };
    }

    const remaining = row.deadlineAt.getTime() - now.getTime();
    if (remaining > 0) {
      const direction: QuizDirection = row.direction === "en_vi" ? "en_vi" : "vi_en";
      return {
        status: "question",
        question: {
          answerId: row.id,
          orderIndex: row.orderIndex,
          questionNumber: row.orderIndex + 1,
          total: attempt.total,
          prompt: direction === "en_vi" ? row.vocabulary.english : row.vocabulary.vietnamese,
          direction,
          remainingMs: remaining,
        },
      };
    }

    // Deadline passed without an answer: mark as timed out, loop to the next question.
    await tx.attemptAnswer.updateMany({
      where: { id: row.id, answeredAt: null },
      data: { answeredAt: now, userAnswer: null, isCorrect: false, timedOut: true },
    });
  }

  // Should be unreachable, but never leave the caller without a definite result.
  await finishAttempt(tx, attempt.id);
  return { status: "finished", attemptId: attempt.id };
}

export async function finishAttempt(tx: TxClient, attemptId: string) {
  const attempt = await tx.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { set: true },
  });
  if (attempt.finishedAt) return; // already finished, idempotent no-op

  const score = await tx.attemptAnswer.count({
    where: { attemptId, isCorrect: true },
  });
  const finishedAt = new Date();

  await tx.attempt.updateMany({
    where: { id: attemptId, finishedAt: null },
    data: {
      score,
      isPass: score >= attempt.set.passScore,
      finishedAt,
      duration: Math.max(0, Math.round((finishedAt.getTime() - attempt.startedAt.getTime()) / 1000)),
    },
  });
}

export async function getAttemptFromCookie() {
  const auth = await readAttemptAuth();
  if (!auth) return null;
  return prisma.attempt.findFirst({
    where: { id: auth.id, sessionToken: auth.token },
    include: { set: { include: { examSchedule: true } } },
  });
}
