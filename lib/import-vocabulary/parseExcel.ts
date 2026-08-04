import * as XLSX from "xlsx";
import type { ColumnMapping, ParseOutcome } from "@/lib/import-vocabulary/types";
import { detectColumns, buildTabularPreview, rowsToParsedPairs } from "@/lib/import-vocabulary/columnMapping";

/**
 * Reads an .xlsx workbook (first sheet with any data) into a header + rows shape.
 * Assumes row 0 is a header (e.g. "English | Vietnamese" or "Từ | Nghĩa") — matches every
 * Excel layout this feature is required to support.
 */
function readWorkbookRows(buffer: Buffer): string[][] | null {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return null;
  }

  const sheetName = workbook.SheetNames.find((name) => {
    const sheet = workbook.Sheets[name];
    const ref = sheet["!ref"];
    return Boolean(ref);
  });
  if (!sheetName) return null;

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });

  return rows.map((row) => row.map((cell) => String(cell ?? "").trim()));
}

export function parseExcelContent(buffer: Buffer, mapping?: ColumnMapping): ParseOutcome {
  const rows = readWorkbookRows(buffer);
  if (rows === null) {
    return { status: "file-error", message: "Không đọc được file Excel. File bị hỏng hoặc không đúng định dạng." };
  }
  if (rows.length === 0) {
    return { status: "file-error", message: "Không tìm thấy dữ liệu." };
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

  return { status: "needs-mapping", preview: buildTabularPreview(rows) };
}
