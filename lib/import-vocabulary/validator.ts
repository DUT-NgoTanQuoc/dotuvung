import type { ParseLineError, ParsedPair } from "@/lib/import-vocabulary/types";

export type RowStatus = "valid" | "duplicate" | "error";
export type DuplicateSource = "file" | "existing";
export type DuplicateStrategy = "skip" | "overwrite" | "keep-both";

export interface PreviewRow {
  id: string;
  line: number;
  english: string;
  vietnamese: string;
  status: RowStatus;
  message?: string;
  duplicateOf?: DuplicateSource;
  /** Vocabulary.id of the existing DB row this duplicates, when duplicateOf === "existing". */
  existingId?: string;
}

export interface ValidateSummary {
  total: number;
  valid: number;
  duplicate: number;
  error: number;
}

export interface ExistingWord {
  id: string;
  english: string;
}

export interface ValidateOptions {
  /** Lowercases both fields before storing/comparing — the "Chữ hoa" normalization option. */
  lowercase?: boolean;
  /** Words already present in the target set, used to flag cross-import duplicates. */
  existing?: ExistingWord[];
}

/** Case/whitespace-insensitive key used to detect duplicate English words. */
function dedupeKey(english: string): string {
  return english.trim().toLowerCase();
}

/**
 * Validates parsed pairs: applies trim/lowercase normalization, flags rows missing either
 * field, and flags duplicates — both against earlier rows in the same import and against
 * words already stored in the target set. Parser-level line errors are folded in as
 * "error" rows so the preview shows one unified, line-ordered list.
 */
export function validateRows(
  pairs: ParsedPair[],
  parseErrors: ParseLineError[],
  options: ValidateOptions = {}
): { rows: PreviewRow[]; summary: ValidateSummary } {
  const existingMap = new Map((options.existing ?? []).map((w) => [dedupeKey(w.english), w.id]));
  const seenInFile = new Set<string>();

  const rows: PreviewRow[] = [];

  pairs.forEach((pair, index) => {
    const english = options.lowercase ? pair.english.toLowerCase() : pair.english;
    const vietnamese = options.lowercase ? pair.vietnamese.toLowerCase() : pair.vietnamese;
    const key = dedupeKey(english);

    if (!english || !vietnamese) {
      rows.push({
        id: `row-${index}`,
        line: pair.line,
        english,
        vietnamese,
        status: "error",
        message: !english ? "Thiếu English" : "Thiếu Vietnamese",
      });
      return;
    }

    if (seenInFile.has(key)) {
      rows.push({
        id: `row-${index}`,
        line: pair.line,
        english,
        vietnamese,
        status: "duplicate",
        duplicateOf: "file",
        message: "Đã phát hiện từ trùng trong file",
      });
      return;
    }

    const existingId = existingMap.get(key);
    if (existingId) {
      rows.push({
        id: `row-${index}`,
        line: pair.line,
        english,
        vietnamese,
        status: "duplicate",
        duplicateOf: "existing",
        existingId,
        message: "Từ đã tồn tại trong bộ từ vựng",
      });
      seenInFile.add(key);
      return;
    }

    seenInFile.add(key);
    rows.push({ id: `row-${index}`, line: pair.line, english, vietnamese, status: "valid" });
  });

  parseErrors.forEach((err, index) => {
    rows.push({
      id: `err-${index}`,
      line: err.line,
      english: err.raw,
      vietnamese: "",
      status: "error",
      message: `Dòng ${err.line} không đúng định dạng`,
    });
  });

  rows.sort((a, b) => a.line - b.line);

  const summary: ValidateSummary = {
    total: rows.length,
    valid: rows.filter((r) => r.status === "valid").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
    error: rows.filter((r) => r.status === "error").length,
  };

  return { rows, summary };
}

/**
 * Recomputes status/message for hand-edited preview rows in place (same id, same order) —
 * used by the preview table so inline edits (e.g. filling in a missing translation) can turn
 * an error/duplicate row valid without a full server round-trip. Only re-checks duplicates
 * against other rows currently in the table and the same `existing` DB list used at parse time.
 */
export function recomputeRowStatuses(rows: PreviewRow[], existing: ExistingWord[] = []): PreviewRow[] {
  const existingMap = new Map(existing.map((w) => [dedupeKey(w.english), w.id]));
  const seen = new Set<string>();

  return rows.map((row) => {
    const english = row.english.trim();
    const vietnamese = row.vietnamese.trim();

    if (!english || !vietnamese) {
      return {
        ...row,
        english,
        vietnamese,
        status: "error",
        message: !english ? "Thiếu English" : "Thiếu Vietnamese",
        duplicateOf: undefined,
        existingId: undefined,
      };
    }

    const key = dedupeKey(english);
    if (seen.has(key)) {
      return {
        ...row,
        english,
        vietnamese,
        status: "duplicate",
        duplicateOf: "file",
        message: "Đã phát hiện từ trùng trong file",
        existingId: undefined,
      };
    }

    const existingId = existingMap.get(key);
    seen.add(key);
    if (existingId) {
      return {
        ...row,
        english,
        vietnamese,
        status: "duplicate",
        duplicateOf: "existing",
        existingId,
        message: "Từ đã tồn tại trong bộ từ vựng",
      };
    }

    return { ...row, english, vietnamese, status: "valid", message: undefined, duplicateOf: undefined, existingId: undefined };
  });
}

export interface ResolvedImportPlan {
  inserts: { english: string; vietnamese: string }[];
  updates: { id: string; english: string; vietnamese: string }[];
  skippedCount: number;
}

/**
 * Turns the (possibly hand-edited) preview rows into a concrete write plan according to the
 * chosen duplicate policy:
 * - skip: duplicate rows are dropped, only first-seen/new words are written.
 * - overwrite: last occurrence wins per word; a duplicate of an existing DB word becomes an
 *   UPDATE of that row instead of a new INSERT.
 * - keep-both: every non-error row is inserted as its own new row (the schema has no unique
 *   constraint on english, so this is safe).
 */
export function resolveDuplicates(rows: PreviewRow[], strategy: DuplicateStrategy): ResolvedImportPlan {
  const usable = rows.filter((r) => r.status !== "error");

  if (strategy === "keep-both") {
    return { inserts: usable.map((r) => ({ english: r.english, vietnamese: r.vietnamese })), updates: [], skippedCount: 0 };
  }

  if (strategy === "skip") {
    const inserts = usable.filter((r) => r.status !== "duplicate").map((r) => ({ english: r.english, vietnamese: r.vietnamese }));
    return { inserts, updates: [], skippedCount: usable.length - inserts.length };
  }

  // overwrite: last occurrence per normalized english wins.
  const byKey = new Map<string, PreviewRow>();
  for (const row of usable) byKey.set(dedupeKey(row.english), row);

  const inserts: ResolvedImportPlan["inserts"] = [];
  const updates: ResolvedImportPlan["updates"] = [];
  for (const row of byKey.values()) {
    if (row.duplicateOf === "existing" && row.existingId) {
      updates.push({ id: row.existingId, english: row.english, vietnamese: row.vietnamese });
    } else {
      inserts.push({ english: row.english, vietnamese: row.vietnamese });
    }
  }

  return { inserts, updates, skippedCount: usable.length - inserts.length - updates.length };
}
