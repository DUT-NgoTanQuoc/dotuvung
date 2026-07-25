"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateSet } from "@/app/admin/actions/sets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconActionButton } from "@/components/icon-action-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SetData = {
  id: string;
  title: string;
  totalQuestions: number;
  passScore: number;
  secondsPerQuestion: number;
};

export function EditSetDialog({ set }: { set: SetData }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconActionButton label="Sửa bộ từ" icon={<Pencil className="h-4 w-4" />} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa bộ từ</DialogTitle>
        </DialogHeader>
        <form
          action={(formData) => {
            startTransition(async () => {
              await updateSet(set.id, formData);
              toast.success(`Đã cập nhật "${set.title}"`);
              setOpen(false);
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor={`edit-title-${set.id}`}>Tiêu đề</Label>
            <Input id={`edit-title-${set.id}`} name="title" defaultValue={set.title} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-total-${set.id}`}>Tổng số câu</Label>
              <Input
                id={`edit-total-${set.id}`}
                name="totalQuestions"
                type="number"
                min={1}
                defaultValue={set.totalQuestions}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-pass-${set.id}`}>Điểm đạt (PASS)</Label>
              <Input
                id={`edit-pass-${set.id}`}
                name="passScore"
                type="number"
                min={1}
                defaultValue={set.passScore}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-seconds-${set.id}`}>Thời gian mỗi câu (giây)</Label>
            <Input
              id={`edit-seconds-${set.id}`}
              name="secondsPerQuestion"
              type="number"
              min={3}
              defaultValue={set.secondsPerQuestion}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
