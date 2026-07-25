"use client";

import { useMemo, useState } from "react";
import { BookX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { VocabRowActions } from "@/app/admin/(dashboard)/vocabulary-sets/[id]/VocabRowActions";

type Vocab = {
  id: string;
  english: string;
  vietnamese: string;
  acceptedAnswers: string[];
  acceptedAnswersVi: string[];
};

export function VocabularyTable({ vocabularies }: { vocabularies: Vocab[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vocabularies;
    return vocabularies.filter(
      (v) =>
        v.english.toLowerCase().includes(q) ||
        v.vietnamese.toLowerCase().includes(q) ||
        v.acceptedAnswers.some((a) => a.toLowerCase().includes(q)) ||
        v.acceptedAnswersVi.some((a) => a.toLowerCase().includes(q))
    );
  }, [vocabularies, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm theo tiếng Anh hoặc tiếng Việt..."
          className="max-w-sm"
        />
        <span className="whitespace-nowrap text-sm text-zinc-500">
          {filtered.length}/{vocabularies.length} từ
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>English</TableHead>
              <TableHead>Vietnamese</TableHead>
              <TableHead>Đáp án Anh khác</TableHead>
              <TableHead>Đáp án Việt khác</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-zinc-400">
                  <div className="flex flex-col items-center gap-2">
                    <BookX className="h-8 w-8 text-zinc-300" />
                    {vocabularies.length === 0 ? "Chưa có từ nào" : "Không tìm thấy từ phù hợp"}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((v, i) => (
              <TableRow
                key={v.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                style={{ animationDelay: `${Math.min(i, 10) * 25}ms`, animationFillMode: "backwards" }}
              >
                <TableCell className="font-medium">{v.english}</TableCell>
                <TableCell>{v.vietnamese}</TableCell>
                <TableCell className="text-zinc-500">{v.acceptedAnswers.join(", ")}</TableCell>
                <TableCell className="text-zinc-500">{v.acceptedAnswersVi.join(", ")}</TableCell>
                <TableCell>
                  <VocabRowActions vocab={v} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
