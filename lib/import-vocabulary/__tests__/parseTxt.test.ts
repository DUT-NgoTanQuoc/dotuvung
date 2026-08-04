import { describe, expect, it } from "vitest";
import { parseTxtContent } from "@/lib/import-vocabulary/parseTxt";

describe("parseTxtContent", () => {
  it("returns nothing for empty input", () => {
    const { pairs, errors } = parseTxtContent("");
    expect(pairs).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("parses a single word with a dash delimiter", () => {
    const { pairs, errors } = parseTxtContent("apple - quả táo");
    expect(errors).toEqual([]);
    expect(pairs).toEqual([{ english: "apple", vietnamese: "quả táo", line: 1 }]);
  });

  it("parses dash, colon, equals and tab delimited lines", () => {
    const raw = ["apple - quả táo", "orange : quả cam", "banana = quả chuối", "grape\tquả nho"].join("\n");
    const { pairs } = parseTxtContent(raw);
    expect(pairs).toEqual([
      { english: "apple", vietnamese: "quả táo", line: 1 },
      { english: "orange", vietnamese: "quả cam", line: 2 },
      { english: "banana", vietnamese: "quả chuối", line: 3 },
      { english: "grape", vietnamese: "quả nho", line: 4 },
    ]);
  });

  it("strips numbered-list prefixes", () => {
    const raw = "1. apple - quả táo\n2) orange - quả cam";
    const { pairs } = parseTxtContent(raw);
    expect(pairs.map((p) => p.english)).toEqual(["apple", "orange"]);
  });

  it("does not split a hyphen inside a compound word", () => {
    const { pairs } = parseTxtContent("well-known - đã biết rõ");
    expect(pairs).toEqual([{ english: "well-known", vietnamese: "đã biết rõ", line: 1 }]);
  });

  it("pairs the two-line list layout (no delimiter, blank-line separated blocks)", () => {
    const raw = "apple\nquả táo\n\norange\nquả cam";
    const { pairs, errors } = parseTxtContent(raw);
    expect(errors).toEqual([]);
    expect(pairs).toEqual([
      { english: "apple", vietnamese: "quả táo", line: 1 },
      { english: "orange", vietnamese: "quả cam", line: 4 },
    ]);
  });

  it("reports a lone unmatched line as a format error", () => {
    const { pairs, errors } = parseTxtContent("apple - quả táo\n\n123456789");
    expect(pairs).toEqual([{ english: "apple", vietnamese: "quả táo", line: 1 }]);
    expect(errors).toEqual([{ line: 3, raw: "123456789", reason: "Dòng không đúng định dạng" }]);
  });

  it("skips blank lines", () => {
    const { pairs } = parseTxtContent("apple - quả táo\n\n\norange - quả cam");
    expect(pairs).toHaveLength(2);
  });

  it("trims surrounding whitespace on every field", () => {
    const { pairs } = parseTxtContent("   apple   -   quả táo   ");
    expect(pairs).toEqual([{ english: "apple", vietnamese: "quả táo", line: 1 }]);
  });

  it("handles special characters and unicode in both fields", () => {
    const { pairs } = parseTxtContent("rock & roll - nhạc rock & roll (thể loại) !@#");
    expect(pairs).toEqual([{ english: "rock & roll", vietnamese: "nhạc rock & roll (thể loại) !@#", line: 1 }]);
  });

  it("parses 1000 lines quickly and correctly", () => {
    const lines = Array.from({ length: 1000 }, (_, i) => `word${i} - nghĩa${i}`);
    const start = performance.now();
    const { pairs, errors } = parseTxtContent(lines.join("\n"));
    const elapsed = performance.now() - start;
    expect(errors).toEqual([]);
    expect(pairs).toHaveLength(1000);
    expect(pairs[999]).toEqual({ english: "word999", vietnamese: "nghĩa999", line: 1000 });
    expect(elapsed).toBeLessThan(1000);
  });
});
