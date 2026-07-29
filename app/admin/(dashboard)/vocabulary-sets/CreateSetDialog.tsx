"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createSet, type SetFormState } from "@/app/admin/actions/sets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const initialState: SetFormState = {};

const SECONDS_OPTIONS = [5, 10, 15, 20, 30, 60];
const WRONG_ANSWER_MS_OPTIONS = [1000, 1500, 2000, 2400, 3000, 5000];
const DIRECTION_OPTIONS = [
  { value: "vi_en", label: "Việt → Anh" },
  { value: "en_vi", label: "Anh → Việt" },
  { value: "mixed", label: "Trộn cả hai" },
];

export function CreateSetDialog() {
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState("20");
  const [direction, setDirection] = useState("vi_en");
  const [allowAnswerReview, setAllowAnswerReview] = useState(true);
  const [showWrongAnswer, setShowWrongAnswer] = useState(true);
  const [wrongAnswerDisplayMs, setWrongAnswerDisplayMs] = useState("2400");
  const [state, formAction, pending] = useActionState(
    async (prev: SetFormState, formData: FormData) => {
      const result = await createSet(prev, formData);
      if (!result.error) {
        setOpen(false);
        toast.success(`Đã tạo bộ từ "${formData.get("title")}"`);
      }
      return result;
    },
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Tạo bộ từ mới
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo bộ từ mới</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề</Label>
            <Input id="title" name="title" placeholder="Week 4" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalQuestions">Tổng số câu</Label>
              <Input
                id="totalQuestions"
                name="totalQuestions"
                type="number"
                min={1}
                defaultValue={50}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passScore">Điểm đạt (PASS)</Label>
              <Input
                id="passScore"
                name="passScore"
                type="number"
                min={1}
                defaultValue={40}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondsPerQuestion">Thời gian mỗi câu (giây)</Label>
            <input type="hidden" name="secondsPerQuestion" value={seconds} />
            <Select value={seconds} onValueChange={setSeconds}>
              <SelectTrigger id="secondsPerQuestion" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECONDS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s} giây
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quizDirection">Chiều đề</Label>
            <input type="hidden" name="quizDirection" value={direction} />
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger id="quizDirection" className="w-full">
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
              <Label htmlFor="allowAnswerReview">Cho xem chi tiết đáp án</Label>
              <p className="text-xs text-zinc-500">
                Học sinh sẽ thấy đáp án đúng/sai từng câu sau khi nộp bài
              </p>
            </div>
            <input type="hidden" name="allowAnswerReview" value={allowAnswerReview ? "on" : "off"} />
            <Switch
              id="allowAnswerReview"
              checked={allowAnswerReview}
              onCheckedChange={setAllowAnswerReview}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-0.5">
              <Label htmlFor="showWrongAnswer">Hiện đáp án đúng khi trả lời sai</Label>
              <p className="text-xs text-zinc-500">
                Khi tắt, học sinh chỉ thấy báo "Sai rồi!" mà không thấy đáp án đúng
              </p>
            </div>
            <input type="hidden" name="showWrongAnswer" value={showWrongAnswer ? "on" : "off"} />
            <Switch
              id="showWrongAnswer"
              checked={showWrongAnswer}
              onCheckedChange={setShowWrongAnswer}
            />
          </div>
          {showWrongAnswer && (
            <div className="space-y-2">
              <Label htmlFor="wrongAnswerDisplayMs">Thời gian hiển thị đáp án sai</Label>
              <input type="hidden" name="wrongAnswerDisplayMs" value={wrongAnswerDisplayMs} />
              <Select value={wrongAnswerDisplayMs} onValueChange={setWrongAnswerDisplayMs}>
                <SelectTrigger id="wrongAnswerDisplayMs" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WRONG_ANSWER_MS_OPTIONS.map((ms) => (
                    <SelectItem key={ms} value={String(ms)}>
                      {ms / 1000}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Đang tạo..." : "Tạo bộ từ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
