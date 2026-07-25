"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateVocabulary, deleteVocabulary } from "@/app/admin/actions/vocab";
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

type Vocab = {
  id: string;
  english: string;
  vietnamese: string;
  acceptedAnswers: string[];
  acceptedAnswersVi: string[];
};

export function VocabRowActions({ vocab }: { vocab: Vocab }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <IconActionButton label="Sửa từ" icon={<Pencil className="h-4 w-4" />} />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa từ vựng</DialogTitle>
          </DialogHeader>
          <form
            action={(formData) => {
              startTransition(async () => {
                await updateVocabulary(vocab.id, formData);
                toast.success(`Đã cập nhật "${vocab.english}"`);
                setOpen(false);
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor={`english-${vocab.id}`}>English</Label>
              <Input id={`english-${vocab.id}`} name="english" defaultValue={vocab.english} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`vietnamese-${vocab.id}`}>Vietnamese</Label>
              <Input
                id={`vietnamese-${vocab.id}`}
                name="vietnamese"
                defaultValue={vocab.vietnamese}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`accepted-${vocab.id}`}>Đáp án tiếng Anh khác (phân cách bằng dấu phẩy)</Label>
              <Input
                id={`accepted-${vocab.id}`}
                name="acceptedAnswers"
                defaultValue={vocab.acceptedAnswers.join(", ")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`accepted-vi-${vocab.id}`}>Đáp án tiếng Việt khác (phân cách bằng dấu phẩy)</Label>
              <Input
                id={`accepted-vi-${vocab.id}`}
                name="acceptedAnswersVi"
                defaultValue={vocab.acceptedAnswersVi.join(", ")}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <IconActionButton
        label="Xoá từ"
        icon={<Trash2 className="h-4 w-4" />}
        className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
        disabled={isPending}
        onClick={() => {
          if (confirm(`Xoá từ "${vocab.english}"?`)) {
            startTransition(async () => {
              await deleteVocabulary(vocab.id);
              toast.success(`Đã xoá "${vocab.english}"`);
            });
          }
        }}
      />
    </div>
  );
}
