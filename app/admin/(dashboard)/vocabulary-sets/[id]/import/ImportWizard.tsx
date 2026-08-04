"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { UploadCloud, FileText, ClipboardPaste, CheckCircle2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { analyzeImport, confirmImport, type AnalyzeState, type ImportResult } from "@/app/admin/actions/import";
import { recomputeRowStatuses, type DuplicateStrategy, type PreviewRow } from "@/lib/import-vocabulary/validator";
import { SOURCE_LABELS, detectSourceFromFilename } from "@/lib/import-vocabulary/sourceMeta";
import type { ImportSource } from "@/lib/import-vocabulary/types";
import { ImportPreviewTable } from "@/app/admin/(dashboard)/vocabulary-sets/[id]/import/ImportPreviewTable";

type Mode = "file" | "paste";

const DUPLICATE_STRATEGY_OPTIONS: { value: DuplicateStrategy; label: string }[] = [
  { value: "skip", label: "Bỏ qua từ trùng" },
  { value: "overwrite", label: "Ghi đè từ trùng" },
  { value: "keep-both", label: "Giữ cả hai" },
];

export function ImportWizard({ setId }: { setId: string }) {
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [lowercase, setLowercase] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [analyzeState, setAnalyzeState] = useState<AnalyzeState>({ status: "idle" });
  const [mapEnglishCol, setMapEnglishCol] = useState<string>("");
  const [mapVietnameseCol, setMapVietnameseCol] = useState<string>("");

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [existing, setExisting] = useState<{ id: string; english: string }[]>([]);
  const [strategy, setStrategy] = useState<DuplicateStrategy>("skip");
  const [source, setSource] = useState<ImportSource | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const [isAnalyzing, startAnalyze] = useTransition();
  const [isImporting, startImport] = useTransition();

  const source_ = mode === "paste" ? "paste" : file ? detectSourceFromFilename(file.name) : null;

  function resetAll() {
    setMode("file");
    setFile(null);
    setPasteText("");
    setAnalyzeState({ status: "idle" });
    setMapEnglishCol("");
    setMapVietnameseCol("");
    setPreviewRows([]);
    setExisting([]);
    setStrategy("skip");
    setSource(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function pickFile(f: File) {
    setFile(f);
    setAnalyzeState({ status: "idle" });
  }

  function runAnalyze(mapping?: { englishCol: string; vietnameseCol: string }) {
    const resolvedSource = source_;
    if (!resolvedSource) {
      toast.error("Vui lòng chọn file hoặc dán nội dung.");
      return;
    }

    const fd = new FormData();
    fd.append("source", resolvedSource);
    fd.append("lowercase", lowercase ? "on" : "off");
    if (resolvedSource === "paste") {
      fd.append("text", pasteText);
    } else if (file) {
      fd.append("file", file);
    }
    if (mapping) {
      fd.append("mapEnglishCol", mapping.englishCol);
      fd.append("mapVietnameseCol", mapping.vietnameseCol);
    }

    startAnalyze(async () => {
      const next = await analyzeImport(setId, analyzeState, fd);
      setAnalyzeState(next);
      if (next.status === "preview") {
        setPreviewRows(next.rows);
        setExisting(next.existing);
        setSource(resolvedSource);
      } else if (next.status === "error") {
        toast.error(next.message);
      }
    });
  }

  function handleRowChange(id: string, field: "english" | "vietnamese", value: string) {
    setPreviewRows((rows) => {
      const updated = rows.map((r) => (r.id === id ? { ...r, [field]: value } : r));
      return recomputeRowStatuses(updated, existing);
    });
  }

  const summary = useMemo(() => {
    return {
      total: previewRows.length,
      valid: previewRows.filter((r) => r.status === "valid").length,
      duplicate: previewRows.filter((r) => r.status === "duplicate").length,
      error: previewRows.filter((r) => r.status === "error").length,
    };
  }, [previewRows]);

  function handleConfirm() {
    if (!source) return;
    startImport(async () => {
      const res = await confirmImport(setId, source, previewRows, strategy);
      setResult(res);
    });
  }

  if (result) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <PartyPopper className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
        <h2 className="text-xl font-bold">Import thành công</h2>
        <p className="mt-1 text-sm text-zinc-500">
          {result.imported} từ được thêm mới
          {result.updated > 0 && `, ${result.updated} từ được ghi đè`}
          {result.skipped > 0 && `, ${result.skipped} từ bị bỏ qua`}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" onClick={resetAll}>
            Tiếp tục Import
          </Button>
          <Button asChild>
            <Link href={`/admin/vocabulary-sets/${setId}`}>Quay lại Bộ từ</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (analyzeState.status === "preview") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <StatCard label="Tổng" value={summary.total} />
          <StatCard label="Hợp lệ" value={summary.valid} className="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Trùng" value={summary.duplicate} className="text-amber-600 dark:text-amber-400" />
          <StatCard label="Lỗi" value={summary.error} className="text-red-600 dark:text-red-400" />
        </div>

        <ImportPreviewTable rows={previewRows} onChange={handleRowChange} />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Xử lý từ trùng:</Label>
            <Select value={strategy} onValueChange={(v) => setStrategy(v as DuplicateStrategy)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DUPLICATE_STRATEGY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetAll} disabled={isImporting}>
              Huỷ
            </Button>
            <Button onClick={handleConfirm} disabled={isImporting || summary.valid + summary.duplicate === 0} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {isImporting ? "Đang lưu..." : "Xác nhận Import"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (analyzeState.status === "needs-mapping") {
    const { headers, sampleRows } = analyzeState;
    return (
      <div className="space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <div>
          <h2 className="font-semibold">Chọn cột dữ liệu</h2>
          <p className="text-sm text-zinc-500">
            Không tự nhận diện được cột English/Vietnamese. Vui lòng chọn thủ công.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cột English</Label>
            <Select value={mapEnglishCol} onValueChange={setMapEnglishCol}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn cột" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {h || `Cột ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cột Vietnamese</Label>
            <Select value={mapVietnameseCol} onValueChange={setMapVietnameseCol}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn cột" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((h, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {h || `Cột ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-auto rounded-md border border-zinc-200 text-xs dark:border-zinc-800">
          <table className="w-full">
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="border-b border-zinc-200 p-2 text-left dark:border-zinc-800">
                    {h || `Cột ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="p-2 text-zinc-500">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetAll}>
            Huỷ
          </Button>
          <Button
            disabled={!mapEnglishCol || !mapVietnameseCol || isAnalyzing}
            onClick={() => runAnalyze({ englishCol: mapEnglishCol, vietnameseCol: mapVietnameseCol })}
          >
            {isAnalyzing ? "Đang phân tích..." : "Phân tích"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "file" ? "default" : "outline"}
          onClick={() => setMode("file")}
          className="gap-1.5"
        >
          <UploadCloud className="h-4 w-4" />
          Upload file
        </Button>
        <Button
          type="button"
          variant={mode === "paste" ? "default" : "outline"}
          onClick={() => setMode("paste")}
          className="gap-1.5"
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste trực tiếp
        </Button>
      </div>

      {mode === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) pickFile(dropped);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
            dragOver
              ? "border-zinc-900 bg-zinc-50 dark:border-zinc-50 dark:bg-zinc-900"
              : "border-zinc-300 dark:border-zinc-700"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.xlsx,.xls,.csv,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />
          <FileText className="h-8 w-8 text-zinc-400" />
          {file ? (
            <p className="font-medium">{file.name}</p>
          ) : (
            <>
              <p className="font-medium">Kéo thả file vào đây, hoặc bấm để chọn</p>
              <p className="text-xs text-zinc-400">Hỗ trợ .docx, .xlsx, .csv, .txt</p>
            </>
          )}
        </div>
      ) : (
        <Textarea
          rows={10}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={"apple - quả táo\norange - quả cam\nbanana - quả chuối"}
          className="font-mono text-sm"
        />
      )}

      <div className="flex items-center gap-2">
        <Switch id="lowercase" checked={lowercase} onCheckedChange={setLowercase} />
        <Label htmlFor="lowercase" className="text-sm">
          Chuyển toàn bộ về chữ thường
        </Label>
      </div>

      {analyzeState.status === "error" && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
          <AlertDescription>{analyzeState.message}</AlertDescription>
        </Alert>
      )}

      {isAnalyzing && <Progress value={66} className="animate-pulse" />}

      <Button onClick={() => runAnalyze()} disabled={isAnalyzing || (!file && !pasteText.trim())} className="gap-1.5">
        {isAnalyzing ? "Đang phân tích..." : "Phân tích"}
      </Button>

      {source_ && <p className="text-xs text-zinc-400">Định dạng nhận diện: {SOURCE_LABELS[source_]}</p>}
    </div>
  );
}

function StatCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
      <div className={cn("text-2xl font-bold", className)}>{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
