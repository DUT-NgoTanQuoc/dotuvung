import type { ImportSource } from "@/lib/import-vocabulary/types";

// Client-safe metadata split out of parser.ts (which pulls in Node-only libs like
// mammoth/xlsx and must never be imported from a "use client" component).

export const SOURCE_LABELS: Record<ImportSource, string> = {
  word: "Word (.docx)",
  excel: "Excel (.xlsx)",
  csv: "CSV",
  txt: "TXT",
  paste: "Paste trực tiếp",
};

export function detectSourceFromFilename(filename: string): ImportSource | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "docx") return "word";
  if (ext === "xlsx" || ext === "xls") return "excel";
  if (ext === "csv") return "csv";
  if (ext === "txt") return "txt";
  return null;
}
