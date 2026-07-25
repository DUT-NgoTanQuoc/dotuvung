"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, BookOpenText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/search-input";
import { LinkIconButton } from "@/components/icon-action-button";
import { EditSetDialog } from "@/app/admin/(dashboard)/vocabulary-sets/EditSetDialog";
import { SetActiveToggle, DeleteSetButton } from "@/app/admin/(dashboard)/vocabulary-sets/SetRowActions";

type SetRow = {
  id: string;
  title: string;
  slug: string;
  totalQuestions: number;
  passScore: number;
  secondsPerQuestion: number;
  isActive: boolean;
  _count: { vocabularies: number; attempts: number };
};

export function VocabularySetsTable({ sets }: { sets: SetRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) => s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
    );
  }, [sets, query]);

  return (
    <div className="space-y-4">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Tìm theo tên hoặc slug..."
        className="max-w-sm"
      />

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Số từ / Tổng câu</TableHead>
              <TableHead>Điểm đạt</TableHead>
              <TableHead>Giây/câu</TableHead>
              <TableHead>Lượt làm</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-zinc-400">
                  {sets.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <BookOpenText className="h-8 w-8 text-zinc-300" />
                      Chưa có bộ từ nào
                    </div>
                  ) : (
                    "Không tìm thấy bộ từ phù hợp"
                  )}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((set, i) => (
              <TableRow
                key={set.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms`, animationFillMode: "backwards" }}
              >
                <TableCell>
                  <Link
                    href={`/admin/vocabulary-sets/${set.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {set.title}
                  </Link>
                </TableCell>
                <TableCell className="text-zinc-500">{set.slug}</TableCell>
                <TableCell>
                  {set._count.vocabularies} / {set.totalQuestions}
                </TableCell>
                <TableCell>{set.passScore}</TableCell>
                <TableCell>{set.secondsPerQuestion}s</TableCell>
                <TableCell>
                  <Badge variant="secondary">{set._count.attempts}</Badge>
                </TableCell>
                <TableCell>
                  <SetActiveToggle id={set.id} isActive={set.isActive} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <LinkIconButton
                      label="Xem chi tiết"
                      icon={<Eye className="h-4 w-4" />}
                      href={`/admin/vocabulary-sets/${set.id}`}
                    />
                    <EditSetDialog set={set} />
                    <DeleteSetButton id={set.id} title={set.title} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
