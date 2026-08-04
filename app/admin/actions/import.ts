"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { parseImportInput } from "@/lib/import-vocabulary/parser";
import { validateRows, resolveDuplicates, type PreviewRow, type DuplicateStrategy } from "@/lib/import-vocabulary/validator";
import type { ImportSource, ColumnMapping } from "@/lib/import-vocabulary/types";

export type AnalyzeState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "needs-mapping";
      headers: string[];
      sampleRows: string[][];
      detected: { englishCol: number | null; vietnameseCol: number | null };
    }
  | {
      status: "preview";
      rows: PreviewRow[];
      summary: { total: number; valid: number; duplicate: number; error: number };
      existing: { id: string; english: string }[];
    };

async function readFileAsText(entry: FormDataEntryValue | null): Promise<string> {
  if (!(entry instanceof File)) return "";
  const buffer = Buffer.from(await entry.arrayBuffer());
  return buffer.toString("utf-8");
}

function readMapping(formData: FormData): ColumnMapping | undefined {
  const en = formData.get("mapEnglishCol");
  const vi = formData.get("mapVietnameseCol");
  if (en === null || vi === null || en === "" || vi === "") return undefined;
  return { englishCol: Number(en), vietnameseCol: Number(vi) };
}

/**
 * Parses the uploaded file / pasted text and runs validation against the target set's
 * existing words. Does not write to the database — the admin confirms via confirmImport
 * after reviewing (and optionally editing) the preview.
 */
export async function analyzeImport(
  setId: string,
  _prev: AnalyzeState,
  formData: FormData
): Promise<AnalyzeState> {
  const source = String(formData.get("source") ?? "") as ImportSource;
  const lowercase = formData.get("lowercase") === "on";
  const fileEntry = formData.get("file");
  const mapping = readMapping(formData);

  try {
    let outcome;
    if (source === "paste") {
      const text = String(formData.get("text") ?? "");
      if (!text.trim()) return { status: "error", message: "Vui lòng dán nội dung cần import." };
      outcome = await parseImportInput({ source: "paste", text });
    } else if (source === "txt") {
      if (!(fileEntry instanceof File)) return { status: "error", message: "Vui lòng chọn file." };
      const text = await readFileAsText(fileEntry);
      outcome = await parseImportInput({ source: "txt", text });
    } else if (source === "word") {
      if (!(fileEntry instanceof File)) return { status: "error", message: "Vui lòng chọn file." };
      const buffer = Buffer.from(await fileEntry.arrayBuffer());
      outcome = await parseImportInput({ source: "word", buffer });
    } else if (source === "excel") {
      if (!(fileEntry instanceof File)) return { status: "error", message: "Vui lòng chọn file." };
      const buffer = Buffer.from(await fileEntry.arrayBuffer());
      outcome = await parseImportInput({ source: "excel", buffer, mapping });
    } else if (source === "csv") {
      if (!(fileEntry instanceof File)) return { status: "error", message: "Vui lòng chọn file." };
      const buffer = Buffer.from(await fileEntry.arrayBuffer());
      outcome = await parseImportInput({ source: "csv", buffer, mapping });
    } else {
      return { status: "error", message: "Định dạng không hỗ trợ." };
    }

    if (outcome.status === "file-error") return { status: "error", message: outcome.message };
    if (outcome.status === "needs-mapping") {
      return {
        status: "needs-mapping",
        headers: outcome.preview.headers,
        sampleRows: outcome.preview.sampleRows,
        detected: outcome.preview.detected,
      };
    }

    const existing = await prisma.vocabulary.findMany({
      where: { setId },
      select: { id: true, english: true },
    });

    const { rows, summary } = validateRows(outcome.result.pairs, outcome.result.errors, {
      lowercase,
      existing,
    });

    if (rows.length === 0) return { status: "error", message: "Không tìm thấy dữ liệu." };
    return { status: "preview", rows, summary, existing };
  } catch {
    return { status: "error", message: "Không đọc được file. File bị hỏng hoặc định dạng không hỗ trợ." };
  }
}

export type ImportResult = { imported: number; updated: number; skipped: number };

/** Applies the admin-reviewed rows inside a single transaction (rollback on any failure) and writes the audit log. */
export async function confirmImport(
  setId: string,
  source: ImportSource,
  rows: PreviewRow[],
  strategy: DuplicateStrategy
): Promise<ImportResult> {
  const session = await auth();
  const adminEmail = session?.user?.email ?? "unknown";
  const plan = resolveDuplicates(rows, strategy);

  await prisma.$transaction(async (tx) => {
    if (plan.inserts.length > 0) {
      await tx.vocabulary.createMany({
        data: plan.inserts.map((r) => ({ setId, english: r.english, vietnamese: r.vietnamese })),
      });
    }
    for (const update of plan.updates) {
      await tx.vocabulary.update({
        where: { id: update.id },
        data: { english: update.english, vietnamese: update.vietnamese },
      });
    }
    await tx.importLog.create({
      data: {
        setId,
        adminEmail,
        source,
        totalRows: rows.length,
        importedRows: plan.inserts.length + plan.updates.length,
        duplicateRows: rows.filter((r) => r.status === "duplicate").length,
        errorRows: rows.filter((r) => r.status === "error").length,
      },
    });
  });

  revalidatePath(`/admin/vocabulary-sets/${setId}`);

  return { imported: plan.inserts.length, updated: plan.updates.length, skipped: plan.skippedCount };
}
