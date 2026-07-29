"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateSet } from "@/app/admin/actions/sets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconActionButton } from "@/components/icon-action-button";
import { Switch } from "@/components/ui/switch";
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
  allowAnswerReview: boolean;
  showWrongAnswer: boolean;
  wrongAnswerDisplayMs: number;
};

const SECONDS_OPTIONS = [5, 10, 15, 20, 30, 60];
const WRONG_ANSWER_MS_OPTIONS = [1000, 1500, 2000, 2400, 3000, 5000];
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
  const [allowAnswerReview, setAllowAnswerReview] = useState(set.allowAnswerReview);
  const [showWrongAnswer, setShowWrongAnswer] = useState(set.showWrongAnswer);
  const [wrongAnswerDisplayMs, setWrongAnswerDisplayMs] = useState(String(set.wrongAnswerDisplayMs));
  const secondsOptions = SECONDS_OPTIONS.includes(set.secondsPerQuestion)
    ? SECONDS_OPTIONS
    : [set.secondsPerQuestion, ...SECONDS_OPTIONS];
  const wrongAnswerMsOptions = WRONG_ANSWER_MS_OPTIONS.includes(set.wrongAnswerDisplayMs)
    ? WRONG_ANSWER_MS_OPTIONS
    : [set.wrongAnswerDisplayMs, ...WRONG_ANSWER_MS_OPTIONS];

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
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-0.5">
              <Label htmlFor={`edit-review-${set.id}`}>Cho xem chi tiết đáp án</Label>
              <p className="text-xs text-zinc-500">
                Học sinh sẽ thấy đáp án đúng/sai từng câu sau khi nộp bài
              </p>
            </div>
            <input type="hidden" name="allowAnswerReview" value={allowAnswerReview ? "on" : "off"} />
            <Switch
              id={`edit-review-${set.id}`}
              checked={allowAnswerReview}
              onCheckedChange={setAllowAnswerReview}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-0.5">
              <Label htmlFor={`edit-showwrong-${set.id}`}>Hiện đáp án đúng khi trả lời sai</Label>
              <p className="text-xs text-zinc-500">
                Khi tắt, học sinh chỉ thấy báo "Sai rồi!" mà không thấy đáp án đúng
              </p>
            </div>
            <input type="hidden" name="showWrongAnswer" value={showWrongAnswer ? "on" : "off"} />
            <Switch
              id={`edit-showwrong-${set.id}`}
              checked={showWrongAnswer}
              onCheckedChange={setShowWrongAnswer}
            />
          </div>
          {showWrongAnswer && (
            <div className="space-y-2">
              <Label htmlFor={`edit-wrongms-${set.id}`}>Thời gian hiển thị đáp án sai</Label>
              <input type="hidden" name="wrongAnswerDisplayMs" value={wrongAnswerDisplayMs} />
              <Select value={wrongAnswerDisplayMs} onValueChange={setWrongAnswerDisplayMs}>
                <SelectTrigger id={`edit-wrongms-${set.id}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {wrongAnswerMsOptions.map((ms) => (
                    <SelectItem key={ms} value={String(ms)}>
                      {ms / 1000}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
