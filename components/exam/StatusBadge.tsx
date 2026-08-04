import type { ExamStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_META: Record<ExamStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  SCHEDULED: { label: "Scheduled", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  OPEN: { label: "Open", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  CLOSED: { label: "Closed", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  ARCHIVED: { label: "Archived", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400" },
};

export function StatusBadge({ status, className }: { status: ExamStatus; className?: string }) {
  const meta = STATUS_META[status];
  return <Badge className={cn(meta.className, "hover:opacity-90", className)}>{meta.label}</Badge>;
}
