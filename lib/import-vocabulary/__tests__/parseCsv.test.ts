import { describe, expect, it } from "vitest";
import { parseCsvContent } from "@/lib/import-vocabulary/parseCsv";

describe("parseCsvContent", () => {
  it("returns empty result for empty input", () => {
    const outcome = parseCsvContent("");
    expect(outcome).toEqual({ status: "ok", result: { pairs: [], errors: [] } });
  });

  it("detects an English/Vietnamese header and maps columns", () => {
    const outcome = parseCsvContent("English,Vietnamese\napple,quả táo\norange,quả cam");
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([
      { english: "apple", vietnamese: "quả táo", line: 2 },
      { english: "orange", vietnamese: "quả cam", line: 3 },
    ]);
  });

  it("detects Vietnamese-style headers (Từ / Nghĩa)", () => {
    const outcome = parseCsvContent("Từ,Nghĩa\napple,quả táo");
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([{ english: "apple", vietnamese: "quả táo", line: 2 }]);
  });

  it("handles quoted fields containing commas", () => {
    const outcome = parseCsvContent('English,Vietnamese\n"hello, world","xin chào, thế giới"');
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([{ english: "hello, world", vietnamese: "xin chào, thế giới", line: 2 }]);
  });

  it("requires manual mapping when headers aren't recognizable", () => {
    const outcome = parseCsvContent("ColA,ColB\napple,quả táo");
    expect(outcome.status).toBe("needs-mapping");
    if (outcome.status !== "needs-mapping") return;
    expect(outcome.preview.headers).toEqual(["ColA", "ColB"]);
  });

  it("parses using an explicit mapping", () => {
    const outcome = parseCsvContent("ColA,ColB\napple,quả táo", { englishCol: 0, vietnameseCol: 1 });
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([{ english: "apple", vietnamese: "quả táo", line: 2 }]);
  });

  it("falls back to delimiter parsing for single-column CSV", () => {
    const outcome = parseCsvContent("apple - quả táo\norange - quả cam");
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([
      { english: "apple", vietnamese: "quả táo", line: 1 },
      { english: "orange", vietnamese: "quả cam", line: 2 },
    ]);
  });

  it("reports a row missing Vietnamese as an error", () => {
    const outcome = parseCsvContent("English,Vietnamese\napple,");
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.errors).toEqual([{ line: 2, raw: "apple | ", reason: "Thiếu Vietnamese" }]);
  });
});
