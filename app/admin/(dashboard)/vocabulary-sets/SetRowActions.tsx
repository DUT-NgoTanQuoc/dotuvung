"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toggleSetActive, deleteSet } from "@/app/admin/actions/sets";
import { Switch } from "@/components/ui/switch";
import { IconActionButton } from "@/components/icon-action-button";

export function SetActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          await toggleSetActive(id, checked);
          toast.success(checked ? "Đã bật hoạt động" : "Đã tắt hoạt động");
        })
      }
    />
  );
}

export function DeleteSetButton({ id, title }: { id: string; title: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <IconActionButton
      label="Xoá bộ từ"
      icon={<Trash2 className="h-4 w-4" />}
      className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Xoá bộ từ "${title}"? Toàn bộ từ vựng trong bộ này sẽ mất.`)) return;
        startTransition(async () => {
          try {
            await deleteSet(id);
            toast.success(`Đã xoá "${title}"`);
          } catch {
            toast.error("Không thể xoá: bộ từ này đã có học sinh làm bài. Hãy tắt (Active) thay vì xoá.");
          }
        });
      }}
    />
  );
}
