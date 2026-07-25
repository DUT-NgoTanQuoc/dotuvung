"use client";

import { useActionState, useState } from "react";
import { createSet, type SetFormState } from "@/app/admin/actions/sets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: SetFormState = {};

export function CreateSetDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: SetFormState, formData: FormData) => {
      const result = await createSet(prev, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Tạo bộ từ mới</Button>
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
            <Input
              id="secondsPerQuestion"
              name="secondsPerQuestion"
              type="number"
              min={3}
              defaultValue={10}
              required
            />
          </div>
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
