/** Where the raw content for an import run came from. Persisted on ImportLog.source. */
export type ImportSource = "word" | "excel" | "csv" | "txt" | "paste";

/** One english/vietnamese pair extracted by a parser, before validation. */
export interface ParsedPair {
  english: string;
  vietnamese: string;
  /** 1-based line/row/paragraph number in the original input, for error messages. */
  line: number;
}

/** A line/row that could not be turned into a pair at all. */
export interface ParseLineError {
  line: number;
  raw: string;
  reason: string;
}

export interface ParseResult {
  pairs: ParsedPair[];
  errors: ParseLineError[];
}

/** Column mapping chosen (or auto-detected) for tabular sources (Excel/CSV with headers). */
export interface ColumnMapping {
  englishCol: number;
  vietnameseCol: number;
}

/** Result of reading a tabular source when the header row can't be confidently mapped. */
export interface TabularPreview {
  headers: string[];
  sampleRows: string[][];
  detected: { englishCol: number | null; vietnameseCol: number | null };
}

export type ParseOutcome =
  | { status: "ok"; result: ParseResult }
  | { status: "needs-mapping"; preview: TabularPreview }
  | { status: "file-error"; message: string };
