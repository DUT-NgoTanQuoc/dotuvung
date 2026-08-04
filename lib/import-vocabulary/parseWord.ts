import mammoth from "mammoth";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { ParsedPair, ParseLineError, ParseOutcome } from "@/lib/import-vocabulary/types";
import { detectColumns } from "@/lib/import-vocabulary/columnMapping";
import { parseTxtContent } from "@/lib/import-vocabulary/parseTxt";

function cellsFromRow($: cheerio.CheerioAPI, tr: Element): string[] {
  return $(tr)
    .find("td, th")
    .toArray()
    .map((cell) => $(cell).text().trim());
}

/** Reads english/vietnamese pairs out of every `<table>` in the document, skipping a header row if present. */
function parseTables($: cheerio.CheerioAPI): { pairs: ParsedPair[]; errors: ParseLineError[] } {
  const pairs: ParsedPair[] = [];
  const errors: ParseLineError[] = [];
  let line = 0;

  $("table").each((_, table) => {
    const rows = $(table).find("tr").toArray();
    if (rows.length === 0) return;

    const firstRowCells = cellsFromRow($, rows[0]);
    const isHeader =
      firstRowCells.length >= 2 &&
      detectColumns(firstRowCells).englishCol !== null &&
      detectColumns(firstRowCells).vietnameseCol !== null;

    const dataRows = isHeader ? rows.slice(1) : rows;

    for (const row of dataRows) {
      line += 1;
      const cells = cellsFromRow($, row);
      const english = (cells[0] ?? "").trim();
      const vietnamese = (cells[1] ?? "").trim();
      if (!english && !vietnamese) continue;
      if (!english || !vietnamese) {
        errors.push({ line, raw: cells.join(" | "), reason: !english ? "Thiếu English" : "Thiếu Vietnamese" });
        continue;
      }
      pairs.push({ english, vietnamese, line });
    }
  });

  return { pairs, errors };
}

/**
 * Parses a .docx file: tables are read structurally (col 0 = English, col 1 = Vietnamese,
 * header row auto-skipped), everything else falls through to the same delimiter/pair-line
 * parser used for TXT and pasted text.
 */
export async function parseWordContent(buffer: Buffer): Promise<ParseOutcome> {
  let html: string;
  try {
    const converted = await mammoth.convertToHtml({ buffer });
    html = converted.value;
  } catch {
    return { status: "file-error", message: "Không đọc được file Word. File bị hỏng." };
  }

  if (!html.trim()) {
    return { status: "file-error", message: "Không tìm thấy dữ liệu." };
  }

  const $ = cheerio.load(html);
  const { pairs: tablePairs, errors: tableErrors } = parseTables($);

  $("table").remove();
  const paragraphs = $("body")
    .find("p, li, h1, h2, h3, h4, h5, h6")
    .toArray()
    .map((el) => $(el).text().trim())
    .filter(Boolean);

  // Joined with single newlines (not blank-line separated): mammoth drops empty paragraphs,
  // so blank-line block boundaries from the original .docx aren't preserved. Every remaining
  // paragraph is treated as one block, and parseTxtContent pairs up consecutive delimiter-less
  // lines (the "apple / quả táo" two-line list layout) within it.
  const { pairs: textPairs, errors: textErrors } = parseTxtContent(paragraphs.join("\n"));

  const pairs = [...tablePairs, ...textPairs];
  const errors = [...tableErrors, ...textErrors];

  if (pairs.length === 0 && errors.length === 0) {
    return { status: "file-error", message: "Không tìm thấy dữ liệu." };
  }

  return { status: "ok", result: { pairs, errors } };
}
