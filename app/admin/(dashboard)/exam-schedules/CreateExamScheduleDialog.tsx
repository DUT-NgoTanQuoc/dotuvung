"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createScheduleAction, type ScheduleFormState } from "@/app/admin/actions/exam-schedule";
import { DEFAULT_TIMEZONE, listTimeZones } from "@/lib/exam-scheduling/timezone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

const initialState: ScheduleFormState = {};
const TIMEZONES = listTimeZones();

export function CreateExamScheduleDialog({
  sets,
}: {
  sets: { id: string; title: string; slug: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [setId, setSetId] = useState(sets[0]?.id ?? "");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [isDraft, setIsDraft] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: ScheduleFormState, formData: FormData) => {
      const result = await createScheduleAction(prev, formData);
      if (!result.error) {
        setOpen(false);
        toast.success("Đã lên lịch thành công.");
      }
      return result;
    },
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5" disabled={sets.length === 0}>
          <Plus className="h-4 w-4" />
          Lên lịch bài kiểm tra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lên lịch bài kiểm tra</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="setId">Bộ từ vựng</Label>
            <input type="hidden" name="setId" value={setId} />
            <Select value={setId} onValueChange={setSetId}>
              <SelectTrigger id="setId" className="w-full">
                <SelectValue placeholder="Chọn bộ từ vựng" />
              </SelectTrigger>
              <SelectContent>
                {sets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Mô tả</Label>
            <Textarea id="description" name="description" placeholder="Mô tả bài kiểm tra (không bắt buộc)" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="openAt">Ngày mở</Label>
              <Input id="openAt" name="openAt" type="datetime-local" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closeAt">Ngày đóng</Label>
              <Input id="closeAt" name="closeAt" type="datetime-local" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <input type="hidden" name="timezone" value={timezone} />
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attemptLimit">Số lần được làm (bỏ trống = không giới hạn)</Label>
            <Input id="attemptLimit" name="attemptLimit" type="number" min={1} placeholder="Không giới hạn" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-0.5">
              <Label htmlFor="isDraft">Lưu dưới dạng bản nháp (Draft)</Label>
              <p className="text-xs text-zinc-500">Chưa kích hoạt lịch, có thể chỉnh sửa sau</p>
            </div>
            <input type="hidden" name="isDraft" value={isDraft ? "on" : "off"} />
            <Switch id="isDraft" checked={isDraft} onCheckedChange={setIsDraft} />
          </div>
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={pending || !setId}>
            {pending ? "Đang lưu..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
