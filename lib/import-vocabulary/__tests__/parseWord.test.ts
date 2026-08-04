import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from "docx";
import { parseWordContent } from "@/lib/import-vocabulary/parseWord";

function cell(text: string): TableCell {
  return new TableCell({ children: [new Paragraph(text)] });
}

async function docxBuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}

describe("parseWordContent", () => {
  it("reports missing data for an empty document", async () => {
    const doc = new Document({ sections: [{ children: [] }] });
    const outcome = await parseWordContent(await docxBuffer(doc));
    expect(outcome.status).toBe("file-error");
  });

  it("reports a file error for garbage bytes", async () => {
    const outcome = await parseWordContent(Buffer.from("not a docx"));
    expect(outcome.status).toBe("file-error");
  });

  it("parses a Word table (with header row skipped)", async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Table({
              rows: [
                new TableRow({ children: [cell("English"), cell("Vietnamese")] }),
                new TableRow({ children: [cell("apple"), cell("quả táo")] }),
                new TableRow({ children: [cell("orange"), cell("quả cam")] }),
              ],
            }),
          ],
        },
      ],
    });
    const outcome = await parseWordContent(await docxBuffer(doc));
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([
      { english: "apple", vietnamese: "quả táo", line: 1 },
      { english: "orange", vietnamese: "quả cam", line: 2 },
    ]);
  });

  it("parses delimiter-style paragraphs", async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ children: [new TextRun("apple - quả táo")] }),
            new Paragraph({ children: [new TextRun("orange - quả cam")] }),
          ],
        },
      ],
    });
    const outcome = await parseWordContent(await docxBuffer(doc));
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs.map((p) => p.english)).toEqual(["apple", "orange"]);
  });

  it("parses the two-line list layout", async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ children: [new TextRun("apple")] }),
            new Paragraph({ children: [new TextRun("quả táo")] }),
            new Paragraph({ children: [new TextRun("orange")] }),
            new Paragraph({ children: [new TextRun("quả cam")] }),
          ],
        },
      ],
    });
    const outcome = await parseWordContent(await docxBuffer(doc));
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.result.pairs).toEqual([
      { english: "apple", vietnamese: "quả táo", line: 1 },
      { english: "orange", vietnamese: "quả cam", line: 3 },
    ]);
  });
});
