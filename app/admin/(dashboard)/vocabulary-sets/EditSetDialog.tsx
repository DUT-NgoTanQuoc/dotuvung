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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SetData = {
  id: string;
  title: string;
  totalQuestions: number;
  passScore: number;
  secondsPerQuestion: number;
  quizDirection: string;
};

const SECONDS_OPTIONS = [5, 10, 15, 20, 30, 60];
const DIRECTION_OPTIONS = [
  { value: "vi_en", label: "Việt → Anh" },
  { value: "en_vi", label: "Anh → Việt" },
  { value: "mixed", label: "Trộn cả hai" },
];

export function EditSetDialog({ set }: { set: SetData }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [seconds, setSeconds] = useState(String(set.secondsPerQuestion));
  const [direction, setDirection] = useState(set.quizDirection);
  const secondsOptions = SECONDS_OPTIONS.includes(set.secondsPerQuestion)
    ? SECONDS_OPTIONS
    : [set.secondsPerQuestion, ...SECONDS_OPTIONS];

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
            <input type="hidden" name="secondsPerQuestion" value={seconds} />
            <Select value={seconds} onValueChange={setSeconds}>
              <SelectTrigger id={`edit-seconds-${set.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {secondsOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} giây
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-direction-${set.id}`}>Chiều đề</Label>
            <input type="hidden" name="quizDirection" value={direction} />
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger id={`edit-direction-${set.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTION_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
