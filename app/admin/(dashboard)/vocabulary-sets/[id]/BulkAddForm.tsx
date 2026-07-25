"use client";

import { useActionState } from "react";
import { bulkAddVocabulary, type VocabFormState } from "@/app/admin/actions/vocab";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: VocabFormState = {};

export function BulkAddForm({ setId }: { setId: string }) {
  const [state, formAction, pending] = useActionState(
    bulkAddVocabulary.bind(null, setId),
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      <Textarea
        name="bulk"
        rows={6}
        placeholder={"apple | quả táo\nbanana | quả chuối\nschool | trường học | schoolhouse"}
        required
      />
      <p className="text-xs text-zinc-400">
        Mỗi dòng: <code>english | vietnamese | đáp án đúng khác (tuỳ chọn, phân cách bằng dấu phẩy)</code>
      </p>
      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.addedCount !== undefined && (
        <Alert>
          <AlertDescription>Đã thêm {state.addedCount} từ.</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Đang thêm..." : "Thêm từ"}
      </Button>
    </form>
  );
}
