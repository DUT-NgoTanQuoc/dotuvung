"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export type SetFormState = { error?: string };

const QUIZ_DIRECTIONS = ["vi_en", "en_vi", "mixed"] as const;

function parseQuizDirection(formData: FormData): string {
  const raw = String(formData.get("quizDirection") ?? "vi_en");
  return (QUIZ_DIRECTIONS as readonly string[]).includes(raw) ? raw : "vi_en";
}

export async function createSet(_prev: SetFormState, formData: FormData): Promise<SetFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const totalQuestions = Number(formData.get("totalQuestions"));
  const passScore = Number(formData.get("passScore"));
  const secondsPerQuestion = Number(formData.get("secondsPerQuestion") ?? 20);
  const quizDirection = parseQuizDirection(formData);
  const allowAnswerReview = formData.get("allowAnswerReview") === "on";

  if (!title) return { error: "Vui lòng nhập tiêu đề." };
  if (!Number.isInteger(totalQuestions) || totalQuestions <= 0) {
    return { error: "Số câu hỏi phải là số nguyên dương." };
  }
  if (!Number.isInteger(passScore) || passScore <= 0 || passScore > totalQuestions) {
    return { error: "Điểm đạt phải là số nguyên dương, không vượt quá tổng số câu." };
  }
  if (!Number.isInteger(secondsPerQuestion) || secondsPerQuestion < 3) {
    return { error: "Thời gian mỗi câu tối thiểu 3 giây." };
  }

  const baseSlug = slugify(title) || "set";
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.vocabularySet.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  await prisma.vocabularySet.create({
    data: { title, slug, totalQuestions, passScore, secondsPerQuestion, quizDirection, allowAnswerReview },
  });

  revalidatePath("/admin/vocabulary-sets");
  revalidatePath("/");
  return {};
}

export async function updateSet(id: string, formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const totalQuestions = Number(formData.get("totalQuestions"));
  const passScore = Number(formData.get("passScore"));
  const secondsPerQuestion = Number(formData.get("secondsPerQuestion") ?? 20);
  const quizDirection = parseQuizDirection(formData);
  const allowAnswerReview = formData.get("allowAnswerReview") === "on";

  await prisma.vocabularySet.update({
    where: { id },
    data: { title, totalQuestions, passScore, secondsPerQuestion, quizDirection, allowAnswerReview },
  });

  revalidatePath("/admin/vocabulary-sets");
  revalidatePath("/");
}

export async function toggleSetActive(id: string, isActive: boolean): Promise<void> {
  await prisma.vocabularySet.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/vocabulary-sets");
  revalidatePath("/");
}

export async function deleteSet(id: string): Promise<void> {
  await prisma.vocabularySet.delete({ where: { id } });
  revalidatePath("/admin/vocabulary-sets");
  revalidatePath("/");
}
