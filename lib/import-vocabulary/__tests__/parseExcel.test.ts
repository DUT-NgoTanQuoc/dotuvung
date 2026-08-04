import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseExcelContent } from "@/lib/import-vocabulary/parseExcel";

function bookBuffer(rows: (string | number)[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("parseExcelContent", () => {
  it("reports a file error for an empty/corrupt upload", () => {
    const outcome = parseExcelContent(Buffer.alloc(0));
    expect(outcome.status).toBe("file-error");
  });

  it("reports missing data for an empty sheet", () => {
    const outcome = parseExcelContent(bookBuffer([]));
    expect(outcome.status).toBe("file-error");
  });

  it("auto-detects English/Vietnamese headers", () => {
    const outcome = parseExcelContent(
      bookBuffer([
        ["English", "Vietnamese"],
        ["apple", "quả táo"],
        ["orange", "quả cam"],
      ])
    );
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([
      { english: "apple", vietnamese: "quả táo", line: 2 },
      { english: "orange", vietnamese: "quả cam", line: 3 },
    ]);
  });

  it("auto-detects Từ/Nghĩa headers", () => {
    const outcome = parseExcelContent(bookBuffer([["Từ", "Nghĩa"], ["apple", "quả táo"]]));
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([{ english: "apple", vietnamese: "quả táo", line: 2 }]);
  });

  it("requests manual mapping for unrecognized columns", () => {
    const outcome = parseExcelContent(bookBuffer([["Col1", "Col2"], ["apple", "quả táo"]]));
    expect(outcome.status).toBe("needs-mapping");
    if (outcome.status !== "needs-mapping") return;
    expect(outcome.preview.headers).toEqual(["Col1", "Col2"]);
    expect(outcome.preview.detected).toEqual({ englishCol: null, vietnameseCol: null });
  });

  it("parses with an explicit mapping after the admin picks columns", () => {
    const outcome = parseExcelContent(bookBuffer([["Col1", "Col2"], ["apple", "quả táo"]]), {
      englishCol: 0,
      vietnameseCol: 1,
    });
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([{ english: "apple", vietnamese: "quả táo", line: 2 }]);
  });

  it("flags a row missing English as an error", () => {
    const outcome = parseExcelContent(bookBuffer([["English", "Vietnamese"], ["", "quả táo"]]));
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.errors).toEqual([{ line: 2, raw: " | quả táo", reason: "Thiếu English" }]);
  });
});
