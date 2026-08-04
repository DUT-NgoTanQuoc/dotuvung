import type { ColumnMapping, ParseOutcome } from "@/lib/import-vocabulary/types";
import { parseTxtContent } from "@/lib/import-vocabulary/parseTxt";
import { parseCsvContent } from "@/lib/import-vocabulary/parseCsv";
import { parseExcelContent } from "@/lib/import-vocabulary/parseExcel";
import { parseWordContent } from "@/lib/import-vocabulary/parseWord";

export type ParseInput =
  | { source: "paste" | "txt"; text: string }
  | { source: "csv"; buffer: Buffer; mapping?: ColumnMapping }
  | { source: "word"; buffer: Buffer }
  | { source: "excel"; buffer: Buffer; mapping?: ColumnMapping };

/** Single entry point that fans out to the right format-specific parser. */
export async function parseImportInput(input: ParseInput): Promise<ParseOutcome> {
  switch (input.source) {
    case "paste":
    case "txt": {
      const text = input.text.trim();
      if (!text) return { status: "file-error", message: "Không tìm thấy dữ liệu." };
      return { status: "ok", result: parseTxtContent(input.text) };
    }
    case "csv":
      return parseCsvContent(input.buffer.toString("utf-8"), input.mapping);
    case "excel":
      return parseExcelContent(input.buffer, input.mapping);
    case "word":
      return parseWordContent(input.buffer);
  }
}

