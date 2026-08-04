import type { ColumnMapping, ParseLineError, ParsedPair, ParseResult, TabularPreview } from "@/lib/import-vocabulary/types";
import { parseTxtContent } from "@/lib/import-vocabulary/parseTxt";

/** Header names commonly used for the English column, compared accent/case-insensitively. */
const ENGLISH_HEADER_ALIASES = ["english", "en", "word", "tu", "term", "vocabulary", "vocab"];

/** Header names commonly used for the Vietnamese column. */
const VIETNAMESE_HEADER_ALIASES = ["vietnamese", "vi", "meaning", "nghia", "dinh nghia", "translation"];

/** Lowercases and strips Vietnamese diacritics so "Từ" matches "tu", "Nghĩa" matches "nghia". */
function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .trim()
    .toLowerCase();
}

export function detectColumns(headers: string[]): { englishCol: number | null; vietnameseCol: number | null } {
  const normalized = headers.map(normalizeHeader);
  const englishCol = normalized.findIndex((h) => ENGLISH_HEADER_ALIASES.includes(h));
  const vietnameseCol = normalized.findIndex((h) => VIETNAMESE_HEADER_ALIASES.includes(h));
  return {
    englishCol: englishCol >= 0 ? englishCol : null,
    vietnameseCol: vietnameseCol >= 0 ? vietnameseCol : null,
  };
}

/** Builds the preview payload the client shows when a mapping choice is required. */
export function buildTabularPreview(rows: string[][]): TabularPreview {
  const headers = rows[0] ?? [];
  return {
    headers,
    sampleRows: rows.slice(1, 6),
    detected: detectColumns(headers),
  };
}

/**
 * Converts raw tabular rows (row 0 = header) into pairs using an explicit or auto-detected
 * column mapping. Rows with a blank cell in either mapped column are skipped as empty (not
 * reported as errors — a single stray blank row in a spreadsheet is normal, not a mistake).
 * A row that has content but is missing one side is reported as an error, matching the
 * "thiếu English/Vietnamese" validation rule applied uniformly across all sources.
 */
export function rowsToParsedPairs(rows: string[][], mapping: ColumnMapping): ParseResult {
  const pairs: ParsedPair[] = [];
  const errors: ParseLineError[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNumber = i + 1; // 1-based, includes the header row
    const english = (row[mapping.englishCol] ?? "").trim();
    const vietnamese = (row[mapping.vietnameseCol] ?? "").trim();

    if (!english && !vietnamese && row.every((c) => !c.trim())) continue;

    if (row.length === 1) {
      // A single-cell row: fall back to delimiter parsing (e.g. "apple - quả táo" saved as one CSV cell).
      const singleCell = row[0]?.trim();
      if (singleCell) {
        const { pairs: subPairs, errors: subErrors } = parseTxtContent(singleCell);
        subPairs.forEach((p) => pairs.push({ ...p, line: rowNumber }));
        subErrors.forEach((e) => errors.push({ ...e, line: rowNumber }));
        continue;
      }
    }

    if (!english || !vietnamese) {
      errors.push({
        line: rowNumber,
        raw: row.join(" | "),
        reason: !english ? "Thiếu English" : "Thiếu Vietnamese",
      });
      continue;
    }

    pairs.push({ english, vietnamese, line: rowNumber });
  }

  return { pairs, errors };
}
