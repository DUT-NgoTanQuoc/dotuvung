import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

/** Extra tolerance (ms) for network latency before a late submit is marked timed out. */
export const GRACE_MS = 1000;

export const ATTEMPT_COOKIE = "dv_attempt";

type TxClient = Prisma.TransactionClient | PrismaClient;

function normalize(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isAnswerCorrect(
  userAnswer: string,
  english: string,
  acceptedAnswers: string[]
): boolean {
  const want = [english, ...acceptedAnswers].map(normalize);
  return want.includes(normalize(userAnswer));
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
  vietnamese: string;
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
  attempt: { id: string; total: number; setId: string; set?: { secondsPerQuestion: number } }
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
      await tx.attemptAnswer.updateMany({
        where: { id: row.id, deadlineAt: null },
        data: { servedAt: now, deadlineAt },
      });
      return {
        status: "question",
        question: {
          answerId: row.id,
          orderIndex: row.orderIndex,
          questionNumber: row.orderIndex + 1,
          total: attempt.total,
          vietnamese: row.vocabulary.vietnamese,
          remainingMs: questionMs,
        },
      };
    }

    const remaining = row.deadlineAt.getTime() - now.getTime();
    if (remaining > 0) {
      return {
        status: "question",
        question: {
          answerId: row.id,
          orderIndex: row.orderIndex,
          questionNumber: row.orderIndex + 1,
          total: attempt.total,
          vietnamese: row.vocabulary.vietnamese,
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
    include: { set: true },
  });
}
