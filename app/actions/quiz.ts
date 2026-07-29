"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  GRACE_MS,
  expectedAnswer,
  isAnswerCorrect,
  readAttemptAuth,
  resolveCurrentQuestion,
  setAttemptCookie,
  shuffle,
  type CurrentQuestion,
} from "@/lib/quiz/session";

export type StartAttemptState = { error?: string };

export async function startAttempt(
  _prev: StartAttemptState,
  formData: FormData
): Promise<StartAttemptState> {
  const studentName = String(formData.get("studentName") ?? "").trim();
  const setSlug = String(formData.get("setSlug") ?? "").trim();

  if (studentName.length < 2 || studentName.length > 60) {
    return { error: "Vui lòng nhập họ tên (2-60 ký tự)." };
  }
  if (!setSlug) {
    return { error: "Vui lòng chọn một bộ từ." };
  }

  const set = await prisma.vocabularySet.findUnique({ where: { slug: setSlug } });
  if (!set || !set.isActive) {
    return { error: "Bộ từ không tồn tại hoặc đã ngừng hoạt động." };
  }

  const vocabularies = await prisma.vocabulary.findMany({ where: { setId: set.id } });
  if (vocabularies.length === 0) {
    return { error: "Bộ từ này chưa có từ vựng nào." };
  }

  const n = Math.min(set.totalQuestions, vocabularies.length);
  const ordered = shuffle(vocabularies).slice(0, n);
  const sessionToken = randomBytes(32).toString("hex");

  const attempt = await prisma.attempt.create({
    data: {
      studentName,
      setId: set.id,
      sessionToken,
      total: n,
      answers: {
        create: ordered.map((vocab, index) => ({
          vocabularyId: vocab.id,
          orderIndex: index,
        })),
      },
    },
  });

  await setAttemptCookie(attempt.id, sessionToken);
  redirect(`/quiz/${set.slug}`);
}

export type LastAnswerFeedback = {
  wasCorrect: boolean;
  wasTimeout: boolean;
  correctAnswer: string | null;
  displayMs: number;
};

export type SubmitResult =
  | { status: "next"; question: CurrentQuestion; lastWasTimeout: boolean; feedback: LastAnswerFeedback | null }
  | { status: "finished"; attemptId: string; feedback: LastAnswerFeedback | null }
  | { status: "error"; reason: "no_attempt" | "already_finished" };

export async function submitAnswer(input: {
  orderIndex: number;
  answer: string;
}): Promise<SubmitResult> {
  const auth = await readAttemptAuth();
  if (!auth) return { status: "error", reason: "no_attempt" };

  return prisma.$transaction(
    async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: { id: auth.id, sessionToken: auth.token },
      include: { set: true },
    });
    if (!attempt) return { status: "error", reason: "no_attempt" };
    if (attempt.finishedAt) return { status: "finished", attemptId: attempt.id, feedback: null };

    const row = await tx.attemptAnswer.findUnique({
      where: { attemptId_orderIndex: { attemptId: attempt.id, orderIndex: input.orderIndex } },
      include: { vocabulary: true },
    });

    let lastWasTimeout = false;
    let feedback: LastAnswerFeedback | null = null;

    if (row && row.answeredAt === null) {
      const now = new Date();
      const late = row.deadlineAt === null || now.getTime() > row.deadlineAt.getTime() + GRACE_MS;
      const direction = row.direction === "en_vi" ? "en_vi" : "vi_en";
      const { correct: expected, accepted } = expectedAnswer(row.vocabulary, direction);
      const correct = late ? false : isAnswerCorrect(input.answer, expected, accepted);
      lastWasTimeout = late;

      await tx.attemptAnswer.updateMany({
        where: { id: row.id, answeredAt: null },
        data: {
          answeredAt: now,
          userAnswer: late ? null : input.answer.trim().slice(0, 100),
          isCorrect: correct,
          timedOut: late,
        },
      });

      if (attempt.set.allowAnswerReview) {
        feedback = {
          wasCorrect: correct,
          wasTimeout: late,
          correctAnswer: correct || !attempt.set.showWrongAnswer ? null : expected,
          displayMs: correct ? 1000 : attempt.set.wrongAnswerDisplayMs,
        };
      }
    }

    const resolved = await resolveCurrentQuestion(tx, attempt);
    if (resolved.status === "finished") {
      return { status: "finished", attemptId: resolved.attemptId, feedback };
    }
    return { status: "next", question: resolved.question, lastWasTimeout, feedback };
    },
    { timeout: 15000, maxWait: 10000 }
  );
}
