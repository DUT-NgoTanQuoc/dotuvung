"use client";

import { useActionState, useState } from "react";
import { Pencil, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { ExamStatus } from "@prisma/client";
import { updateScheduleAction, type ScheduleFormState } from "@/app/admin/actions/exam-schedule";
import { listTimeZones, toDateTimeLocalValue } from "@/lib/exam-scheduling/timezone";
import { IconActionButton } from "@/components/icon-action-button";
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

const TIMEZONES = listTimeZones();

type ScheduleData = {
  id: string;
  description: string | null;
  attemptLimit: number | null;
  openAt: Date;
  closeAt: Date;
  timezone: string;
  computedStatus: ExamStatus;
  set: { title: string };
};

export function EditExamScheduleDialog({ schedule }: { schedule: ScheduleData }) {
  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState(schedule.timezone);
  const [isDraft, setIsDraft] = useState(schedule.computedStatus === "DRAFT");
  const initialState: ScheduleFormState = {};

  const [state, formAction, pending] = useActionState(
    async (prev: ScheduleFormState, formData: FormData) => {
      const result = await updateScheduleAction(schedule.id, prev, formData);
      if (!result.error) {
        setOpen(false);
        toast.success(`Đã cập nhật lịch cho "${schedule.set.title}"`);
      }
      return result;
    },
    initialState
  );

  const isClosedOrArchived = schedule.computedStatus === "CLOSED" || schedule.computedStatus === "ARCHIVED";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconActionButton label="Sửa lịch" icon={<Pencil className="h-4 w-4" />} />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa lịch — {schedule.set.title}</DialogTitle>
        </DialogHeader>

        {schedule.computedStatus === "OPEN" && (
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>
              Bài kiểm tra đang mở — thay đổi lịch có thể ảnh hưởng đến học sinh đang làm bài.
            </AlertDescription>
          </Alert>
        )}
        {isClosedOrArchived && (
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertDescription>
              Bài kiểm tra đã đóng/lưu trữ — chỉ Super Admin được sửa lịch này.
            </AlertDescription>
          </Alert>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-desc-${schedule.id}`}>Mô tả</Label>
            <Textarea
              id={`edit-desc-${schedule.id}`}
              name="description"
              defaultValue={schedule.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-openAt-${schedule.id}`}>Ngày mở</Label>
              <Input
                id={`edit-openAt-${schedule.id}`}
                name="openAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(schedule.openAt, schedule.timezone)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-closeAt-${schedule.id}`}>Ngày đóng</Label>
              <Input
                id={`edit-closeAt-${schedule.id}`}
                name="closeAt"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(schedule.closeAt, schedule.timezone)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-tz-${schedule.id}`}>Timezone</Label>
            <input type="hidden" name="timezone" value={timezone} />
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id={`edit-tz-${schedule.id}`} className="w-full">
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
            <Label htmlFor={`edit-limit-${schedule.id}`}>Số lần được làm (bỏ trống = không giới hạn)</Label>
            <Input
              id={`edit-limit-${schedule.id}`}
              name="attemptLimit"
              type="number"
              min={1}
              defaultValue={schedule.attemptLimit ?? ""}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="space-y-0.5">
              <Label htmlFor={`edit-draft-${schedule.id}`}>Lưu dưới dạng bản nháp (Draft)</Label>
            </div>
            <input type="hidden" name="isDraft" value={isDraft ? "on" : "off"} />
            <Switch id={`edit-draft-${schedule.id}`} checked={isDraft} onCheckedChange={setIsDraft} />
          </div>
          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
