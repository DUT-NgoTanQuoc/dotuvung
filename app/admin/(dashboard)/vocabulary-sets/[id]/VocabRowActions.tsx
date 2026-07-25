"use client";

import { useState, useTransition } from "react";
import { updateVocabulary, deleteVocabulary } from "@/app/admin/actions/vocab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
};

export function VocabRowActions({ vocab }: { vocab: Vocab }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Sửa
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa từ vựng</DialogTitle>
          </DialogHeader>
          <form
            action={(formData) => {
              startTransition(async () => {
                await updateVocabulary(vocab.id, formData);
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
              <Label htmlFor={`accepted-${vocab.id}`}>Đáp án đúng khác (phân cách bằng dấu phẩy)</Label>
              <Input
                id={`accepted-${vocab.id}`}
                name="acceptedAnswers"
                defaultValue={vocab.acceptedAnswers.join(", ")}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700"
        disabled={isPending}
        onClick={() => {
          if (confirm(`Xoá từ "${vocab.english}"?`)) {
            startTransition(() => deleteVocabulary(vocab.id));
          }
        }}
      >
        Xoá
      </Button>
    </div>
  );
}
