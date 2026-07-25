"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, History, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAttempt } from "@/app/admin/actions/attempts";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/search-input";
import { IconActionButton, LinkIconButton } from "@/components/icon-action-button";

type AttemptRow = {
  id: string;
  studentName: string;
  score: number;
  total: number;
  isPass: boolean;
  duration: number | null;
  finishedAt: Date | null;
  set: { title: string };
};

function DeleteAttemptButton({ id, studentName }: { id: string; studentName: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <IconActionButton
      label="Xoá lượt làm bài"
      icon={<Trash2 className="h-4 w-4" />}
      className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Xoá lượt làm bài của "${studentName}"? Không thể hoàn tác.`)) return;
        startTransition(async () => {
          await deleteAttempt(id);
          toast.success("Đã xoá lượt làm bài");
        });
      }}
    />
  );
}

export function AttemptsTable({ attempts }: { attempts: AttemptRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attempts;
    return attempts.filter(
      (a) => a.studentName.toLowerCase().includes(q) || a.set.title.toLowerCase().includes(q)
    );
  }, [attempts, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Tìm theo tên học sinh hoặc bộ từ..."
          className="max-w-sm"
        />
        <span className="whitespace-nowrap text-sm text-zinc-500">
          {filtered.length}/{attempts.length} lượt
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Bộ từ</TableHead>
              <TableHead>Điểm</TableHead>
              <TableHead>Kết quả</TableHead>
              <TableHead>Thời gian làm</TableHead>
              <TableHead>Nộp lúc</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-zinc-400">
                  <div className="flex flex-col items-center gap-2">
                    <History className="h-8 w-8 text-zinc-300" />
                    {attempts.length === 0 ? "Chưa có lượt làm bài nào" : "Không tìm thấy kết quả phù hợp"}
                  </div>
                </TableCell>
              </TableRow>
            )}
            {filtered.map((a, i) => (
              <TableRow
                key={a.id}
                className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                style={{ animationDelay: `${Math.min(i, 10) * 25}ms`, animationFillMode: "backwards" }}
              >
                <TableCell className="font-medium">{a.studentName}</TableCell>
                <TableCell>{a.set.title}</TableCell>
                <TableCell>
                  {a.score}/{a.total}
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      a.isPass
                        ? "bg-green-600 text-white hover:bg-green-600"
                        : "bg-red-600 text-white hover:bg-red-600"
                    }
                  >
                    {a.isPass ? "PASS" : "FAIL"}
                  </Badge>
                </TableCell>
                <TableCell>{a.duration ?? "-"}s</TableCell>
                <TableCell className="text-zinc-500">
                  {a.finishedAt ? new Date(a.finishedAt).toLocaleString("vi-VN") : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <LinkIconButton
                      label="Xem chi tiết"
                      icon={<Eye className="h-4 w-4" />}
                      href={`/admin/attempts/${a.id}`}
                    />
                    <DeleteAttemptButton id={a.id} studentName={a.studentName} />
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
