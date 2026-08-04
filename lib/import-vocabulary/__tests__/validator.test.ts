import { describe, expect, it } from "vitest";
import { validateRows, resolveDuplicates, recomputeRowStatuses } from "@/lib/import-vocabulary/validator";
import type { ParsedPair } from "@/lib/import-vocabulary/types";

function pair(english: string, vietnamese: string, line: number): ParsedPair {
  return { english, vietnamese, line };
}

describe("validateRows", () => {
  it("handles an empty parse result", () => {
    const { rows, summary } = validateRows([], []);
    expect(rows).toEqual([]);
    expect(summary).toEqual({ total: 0, valid: 0, duplicate: 0, error: 0 });
  });

  it("marks a single valid pair", () => {
    const { rows, summary } = validateRows([pair("apple", "quả táo", 1)], []);
    expect(rows).toEqual([{ id: "row-0", line: 1, english: "apple", vietnamese: "quả táo", status: "valid" }]);
    expect(summary).toEqual({ total: 1, valid: 1, duplicate: 0, error: 0 });
  });

  it("flags an in-file duplicate (case-insensitive, trimmed)", () => {
    const { rows, summary } = validateRows([pair("apple", "quả táo", 1), pair(" Apple ", "quả táo khác", 2)], []);
    expect(rows[1].status).toBe("duplicate");
    expect(rows[1].duplicateOf).toBe("file");
    expect(summary.duplicate).toBe(1);
  });

  it("flags a duplicate against an existing DB word", () => {
    const { rows } = validateRows([pair("apple", "quả táo", 1)], [], {
      existing: [{ id: "abc123", english: "apple" }],
    });
    expect(rows[0].status).toBe("duplicate");
    expect(rows[0].duplicateOf).toBe("existing");
    expect(rows[0].existingId).toBe("abc123");
  });

  it("lowercases both fields when the option is enabled", () => {
    const { rows } = validateRows([pair("Apple", "Quả Táo", 1)], [], { lowercase: true });
    expect(rows[0]).toMatchObject({ english: "apple", vietnamese: "quả táo" });
  });

  it("folds parser line errors into the row list", () => {
    const { rows, summary } = validateRows([], [{ line: 15, raw: "123456789", reason: "Dòng không đúng định dạng" }]);
    expect(rows).toEqual([
      { id: "err-0", line: 15, english: "123456789", vietnamese: "", status: "error", message: "Dòng 15 không đúng định dạng" },
    ]);
    expect(summary.error).toBe(1);
  });

  it("sorts the combined row list by original line number", () => {
    const { rows } = validateRows([pair("orange", "quả cam", 5)], [{ line: 2, raw: "bad", reason: "x" }]);
    expect(rows.map((r) => r.line)).toEqual([2, 5]);
  });
});

describe("recomputeRowStatuses", () => {
  it("turns an error row valid once the missing field is filled in", () => {
    const initial = validateRows([pair("apple", "", 1)], []).rows;
    expect(initial[0].status).toBe("error");
    const fixed = recomputeRowStatuses(
      initial.map((r) => (r.id === "row-0" ? { ...r, vietnamese: "quả táo" } : r)),
      []
    );
    expect(fixed[0].status).toBe("valid");
  });

  it("preserves row id and order after recompute", () => {
    const rows = validateRows([pair("apple", "quả táo", 1), pair("orange", "quả cam", 2)], []).rows;
    const recomputed = recomputeRowStatuses(rows, []);
    expect(recomputed.map((r) => r.id)).toEqual(rows.map((r) => r.id));
  });
});

describe("resolveDuplicates", () => {
  const base = validateRows(
    [pair("apple", "quả táo 1", 1), pair("apple", "quả táo 2", 2), pair("banana", "quả chuối", 3)],
    []
  ).rows;

  it("skip: drops later duplicate occurrences", () => {
    const plan = resolveDuplicates(base, "skip");
    expect(plan.inserts).toEqual([
      { english: "apple", vietnamese: "quả táo 1" },
      { english: "banana", vietnamese: "quả chuối" },
    ]);
    expect(plan.skippedCount).toBe(1);
  });

  it("keep-both: inserts every non-error row", () => {
    const plan = resolveDuplicates(base, "keep-both");
    expect(plan.inserts).toHaveLength(3);
    expect(plan.skippedCount).toBe(0);
  });

  it("overwrite: last occurrence wins, and updates an existing DB row instead of inserting", () => {
    const withExisting = validateRows([pair("apple", "quả táo mới", 1)], [], {
      existing: [{ id: "existing-1", english: "apple" }],
    }).rows;
    const plan = resolveDuplicates(withExisting, "overwrite");
    expect(plan.inserts).toEqual([]);
    expect(plan.updates).toEqual([{ id: "existing-1", english: "apple", vietnamese: "quả táo mới" }]);
  });

  it("excludes error rows regardless of strategy", () => {
    const rows = validateRows([pair("apple", "", 1)], []).rows;
    expect(resolveDuplicates(rows, "keep-both").inserts).toEqual([]);
  });
});
