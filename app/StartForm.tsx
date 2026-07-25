"use client";

import { useActionState, useState } from "react";
import { startAttempt, type StartAttemptState } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SetOption = { slug: string; title: string; totalQuestions: number };

const initialState: StartAttemptState = {};

export function StartForm({ sets }: { sets: SetOption[] }) {
  const [state, formAction, pending] = useActionState(startAttempt, initialState);
  const [selectedSlug, setSelectedSlug] = useState(sets[0]?.slug ?? "");

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="studentName">Họ tên</Label>
            <Input
              id="studentName"
              name="studentName"
              placeholder="Nguyễn Văn A"
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="setSlug">Chọn bộ từ</Label>
            <input type="hidden" name="setSlug" value={selectedSlug} />
            <Select value={selectedSlug} onValueChange={setSelectedSlug}>
              <SelectTrigger id="setSlug" className="w-full">
                <SelectValue placeholder="Chọn bộ từ..." />
              </SelectTrigger>
              <SelectContent>
                {sets.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.title} ({s.totalQuestions} từ)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={pending || !selectedSlug}
          >
            {pending ? "Đang bắt đầu..." : "BẮT ĐẦU"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
