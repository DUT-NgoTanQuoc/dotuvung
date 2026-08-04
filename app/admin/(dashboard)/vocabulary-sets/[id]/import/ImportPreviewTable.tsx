"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PreviewRow } from "@/lib/import-vocabulary/validator";

const STATUS_META = {
  valid: { icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400", label: "Hợp lệ" },
  duplicate: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400", label: "Trùng" },
  error: { icon: XCircle, className: "text-red-600 dark:text-red-400", label: "Lỗi" },
} as const;

const ROW_BG: Record<PreviewRow["status"], string> = {
  valid: "",
  duplicate: "bg-amber-50 dark:bg-amber-950/30",
  error: "bg-red-50 dark:bg-red-950/30",
};

export function ImportPreviewTable({
  rows,
  onChange,
}: {
  rows: PreviewRow[];
  onChange: (id: string, field: "english" | "vietnamese", value: string) => void;
}) {
  return (
    <div className="max-h-[520px] overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <Table>
        <TableHeader className="sticky top-0 bg-white dark:bg-zinc-950">
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead className="w-8"></TableHead>
            <TableHead>English</TableHead>
            <TableHead>Vietnamese</TableHead>
            <TableHead>Ghi chú</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const meta = STATUS_META[row.status];
            const Icon = meta.icon;
            return (
              <TableRow key={row.id} className={cn(ROW_BG[row.status])}>
                <TableCell className="text-xs text-zinc-400">{row.line}</TableCell>
                <TableCell>
                  <Icon className={cn("h-4 w-4", meta.className)} aria-label={meta.label} />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.english}
                    onChange={(e) => onChange(row.id, "english", e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.vietnamese}
                    onChange={(e) => onChange(row.id, "vietnamese", e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell className={cn("text-xs", meta.className)}>{row.message}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
