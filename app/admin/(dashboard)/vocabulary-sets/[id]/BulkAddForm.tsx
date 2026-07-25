"use client";

import { useActionState, useEffect, useRef } from "react";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";
import { bulkAddVocabulary, type VocabFormState } from "@/app/admin/actions/vocab";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: VocabFormState = {};

export function BulkAddForm({ setId }: { setId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    bulkAddVocabulary.bind(null, setId),
    initialState
  );

  useEffect(() => {
    if (state?.addedCount !== undefined) {
      toast.success(`Đã thêm ${state.addedCount} từ`);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <Textarea
        name="bulk"
        rows={6}
        placeholder={"apple | quả táo\nbanana | quả chuối\nschool | trường học | schoolhouse"}
        required
        className="font-mono text-sm"
      />
      <p className="text-xs text-zinc-400">
        Mỗi dòng: <code>english | vietnamese | đáp án đúng khác (tuỳ chọn, phân cách bằng dấu phẩy)</code>
      </p>
      {state?.error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="gap-1.5">
        <ListPlus className="h-4 w-4" />
        {pending ? "Đang thêm..." : "Thêm từ"}
      </Button>
    </form>
  );
}
