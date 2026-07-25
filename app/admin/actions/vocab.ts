"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type VocabFormState = { error?: string; addedCount?: number };

function parseCsv(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

/**
 * Bulk add via textarea. One vocab per line:
 *   english | vietnamese | acceptedEn1,acceptedEn2 | acceptedVi1,acceptedVi2
 * Both accepted-answers segments are optional.
 */
export async function bulkAddVocabulary(
  setId: string,
  _prev: VocabFormState,
  formData: FormData
): Promise<VocabFormState> {
  const raw = String(formData.get("bulk") ?? "");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { error: "Vui lòng nhập ít nhất một từ." };

  const rows: {
    setId: string;
    english: string;
    vietnamese: string;
    acceptedAnswers: string[];
    acceptedAnswersVi: string[];
  }[] = [];

  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    const [english, vietnamese, acceptedRaw, acceptedViRaw] = parts;
    if (!english || !vietnamese) {
      return {
        error: `Dòng không hợp lệ: "${line}". Định dạng: english | vietnamese | đáp án Anh khác (tuỳ chọn) | đáp án Việt khác (tuỳ chọn)`,
      };
    }
    rows.push({
      setId,
      english,
      vietnamese,
      acceptedAnswers: parseCsv(acceptedRaw),
      acceptedAnswersVi: parseCsv(acceptedViRaw),
    });
  }

  await prisma.vocabulary.createMany({ data: rows });
  revalidatePath(`/admin/vocabulary-sets/${setId}`);
  return { addedCount: rows.length };
}

export async function updateVocabulary(id: string, formData: FormData): Promise<void> {
  const english = String(formData.get("english") ?? "").trim();
  const vietnamese = String(formData.get("vietnamese") ?? "").trim();
  const acceptedAnswers = parseCsv(String(formData.get("acceptedAnswers") ?? ""));
  const acceptedAnswersVi = parseCsv(String(formData.get("acceptedAnswersVi") ?? ""));

  const vocab = await prisma.vocabulary.update({
    where: { id },
    data: { english, vietnamese, acceptedAnswers, acceptedAnswersVi },
  });

  revalidatePath(`/admin/vocabulary-sets/${vocab.setId}`);
}

export async function deleteVocabulary(id: string): Promise<void> {
  const vocab = await prisma.vocabulary.delete({ where: { id } });
  revalidatePath(`/admin/vocabulary-sets/${vocab.setId}`);
}
