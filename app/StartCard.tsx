"use client";

import { useActionState, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { startAttempt, type StartAttemptState } from "@/app/actions/quiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function StartCard({
  sets,
  defaultSlug,
  defaultName,
}: {
  sets: SetOption[];
  defaultSlug?: string;
  defaultName?: string;
}) {
  const [state, formAction, pending] = useActionState(startAttempt, initialState);
  const validDefaultSlug = defaultSlug && sets.some((s) => s.slug === defaultSlug) ? defaultSlug : undefined;
  const [selectedSlug, setSelectedSlug] = useState(validDefaultSlug ?? sets[0]?.slug ?? "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: "easeInOut" }}
      className="w-full max-w-[500px]"
    >
      <Card className="rounded-[24px] border border-white/70 bg-white/80 p-10 shadow-[0_20px_50px_-15px_rgba(176,197,246,0.5)] backdrop-blur-xl">
        <CardContent className="p-0">
          <form action={formAction} className="space-y-4">
            <Input
              name="studentName"
              placeholder="Nhập tên của bạn..."
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              defaultValue={defaultName ?? ""}
              autoFocus
              className="h-14 rounded-2xl border-transparent bg-white/80 px-4 text-base text-[#334155] placeholder:text-[#94A3B8] transition-all duration-200 ease-in-out focus-visible:border-[#B0C5F6] focus-visible:shadow-[0_0_20px_rgba(176,197,246,0.4)] focus-visible:ring-0"
            />

            <input type="hidden" name="setSlug" value={selectedSlug} />
            <Select value={selectedSlug} onValueChange={setSelectedSlug}>
              <SelectTrigger className="h-14 w-full rounded-2xl border-transparent bg-white/80 px-4 text-base text-[#334155] transition-all duration-200 ease-in-out data-[placeholder]:text-[#94A3B8]">
                <SelectValue placeholder="Chọn bộ từ vựng..." />
              </SelectTrigger>
              <SelectContent>
                {sets.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.title} ({s.totalQuestions} từ)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {state?.error && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="h-14 w-full rounded-2xl bg-[#B0C5F6] text-base font-semibold text-[#334155] shadow-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-[#B0C5F6] hover:shadow-lg active:scale-[0.98]"
              disabled={pending || !selectedSlug}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang bắt đầu...
                </>
              ) : (
                "BẮT ĐẦU"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
