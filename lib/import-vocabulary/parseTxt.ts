import type { ParseLineError, ParsedPair, ParseResult } from "@/lib/import-vocabulary/types";

/** Strips a leading "1. " / "2) " ordinal marker some teachers paste in front of each entry. */
const NUMBERED_PREFIX = /^\s*\d+[.)]\s*/;

/**
 * Line-level delimiter patterns, tried in order. Each captures (english, vietnamese).
 * - Tab: whatever precedes/follows the first tab (e.g. pasted from a spreadsheet).
 * - Colon / equals: optional surrounding whitespace, since these never appear inside a word.
 * - Dash: requires whitespace on both sides, otherwise "well-known - biết rõ" would split on
 *   the hyphen inside "well-known" instead of the intended separator.
 */
const DELIMITER_PATTERNS: RegExp[] = [
  /^(.+?)\t+(.+)$/,
  /^(.+?)\s*:\s*(.+)$/,
  /^(.+?)\s*=\s*(.+)$/,
  /^(.+?)\s+-\s+(.+)$/,
];

function matchDelimitedLine(line: string): { english: string; vietnamese: string } | null {
  const withoutOrdinal = line.replace(NUMBERED_PREFIX, "");
  for (const pattern of DELIMITER_PATTERNS) {
    const match = withoutOrdinal.match(pattern);
    if (match) {
      const english = match[1].trim();
      const vietnamese = match[2].trim();
      if (english && vietnamese) return { english, vietnamese };
    }
  }
  return null;
}

/**
 * Parses freeform text (TXT upload or pasted content) into english/vietnamese pairs.
 *
 * Supports, per line: "apple - quả táo", "apple : quả táo", "apple = quả táo",
 * "apple\tquả táo", and numbered variants ("1. apple - quả táo").
 *
 * Also supports the two-line pair layout (no delimiter at all):
 *   apple
 *   quả táo
 *
 *   orange
 *   quả cam
 * Text is split into blocks separated by one or more blank lines. Within a block, lines
 * that don't match any delimiter are collected and paired up consecutively (line 1 = english,
 * line 2 = vietnamese, ...). A leftover single unmatched line is reported as a format error.
 */
export function parseTxtContent(raw: string): ParseResult {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");

  const pairs: ParsedPair[] = [];
  const errors: ParseLineError[] = [];

  let block: { text: string; lineNo: number }[] = [];

  const flushBlock = () => {
    if (block.length === 0) return;

    const unmatched: { text: string; lineNo: number }[] = [];
    for (const entry of block) {
      const matched = matchDelimitedLine(entry.text);
      if (matched) {
        pairs.push({ ...matched, line: entry.lineNo });
      } else {
        unmatched.push(entry);
      }
    }

    for (let i = 0; i < unmatched.length; i += 2) {
      const en = unmatched[i];
      const vi = unmatched[i + 1];
      if (vi) {
        pairs.push({ english: en.text, vietnamese: vi.text, line: en.lineNo });
      } else {
        errors.push({ line: en.lineNo, raw: en.text, reason: "Dòng không đúng định dạng" });
      }
    }

    block = [];
  };

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const text = rawLine.trim();
    if (!text) {
      flushBlock();
      return;
    }
    block.push({ text, lineNo });
  });
  flushBlock();

  return { pairs, errors };
}
