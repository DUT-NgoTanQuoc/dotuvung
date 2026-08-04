import type { ColumnMapping, ParseOutcome } from "@/lib/import-vocabulary/types";
import { detectColumns, buildTabularPreview, rowsToParsedPairs } from "@/lib/import-vocabulary/columnMapping";
import { parseTxtContent } from "@/lib/import-vocabulary/parseTxt";

/**
 * Minimal RFC 4180 tokenizer: handles quoted fields, commas/newlines inside quotes,
 * and escaped quotes ("") without pulling in a dependency for two-column CSVs.
 */
function tokenizeCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (inQuotes) {
      if (char === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && raw[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Parses CSV (UTF-8) content: header-mapped when a recognizable header row is found, otherwise treated as 2 plain columns (english, vietnamese). */
export function parseCsvContent(raw: string, mapping?: ColumnMapping): ParseOutcome {
  const rows = tokenizeCsv(raw);
  if (rows.length === 0) {
    return { status: "ok", result: { pairs: [], errors: [] } };
  }

  if (mapping) {
    return { status: "ok", result: rowsToParsedPairs(rows, mapping) };
  }

  const detected = detectColumns(rows[0]);
  if (detected.englishCol !== null && detected.vietnameseCol !== null) {
    return {
      status: "ok",
      result: rowsToParsedPairs(rows, { englishCol: detected.englishCol, vietnameseCol: detected.vietnameseCol }),
    };
  }

  const maxCols = Math.max(...rows.map((r) => r.length));
  if (maxCols >= 2) {
    // No recognizable header — let the admin confirm which columns to use.
    return { status: "needs-mapping", preview: buildTabularPreview(rows) };
  }

  // No usable header and only one column: there's no header row to skip — treat every row as
  // plain text and reuse the TXT delimiter/pair-line parser instead of the header-mapped path.
  return { status: "ok", result: parseTxtContent(rows.map((r) => r[0] ?? "").join("\n")) };
}
