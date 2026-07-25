"use client";

import { useTransition } from "react";
import { toggleSetActive, deleteSet } from "@/app/admin/actions/sets";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function SetActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => startTransition(() => toggleSetActive(id, checked))}
    />
  );
}

export function DeleteSetButton({ id, title }: { id: string; title: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Xoá bộ từ "${title}"? Toàn bộ từ vựng trong bộ này sẽ mất.`)) return;
        startTransition(async () => {
          try {
            await deleteSet(id);
          } catch {
            alert("Không thể xoá: bộ từ này đã có học sinh làm bài. Hãy tắt (Active) thay vì xoá.");
          }
        });
      }}
    >
      Xoá
    </Button>
  );
}
