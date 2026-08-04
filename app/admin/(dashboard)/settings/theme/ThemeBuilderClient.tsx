"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Undo2, RotateCcw, Check, AlertTriangle, Info } from "lucide-react";
import { useTheme } from "@/lib/theme/use-theme";
import {
  saveThemeAction,
  resetThemeAction,
  undoThemeAction,
  type ThemeActionState,
} from "@/app/admin/actions/theme";
import { DEFAULT_THEME } from "@/lib/theme/default-theme";
import {
  THEME_COLOR_KEYS,
  THEME_COLOR_LABELS,
  type ThemeColors,
  type ThemePreset,
  type WebsiteTheme,
} from "@/lib/theme/tokens";
import { isValidHexColor, validateThemeContrast, CONTRAST_HARD_FAIL_THRESHOLD } from "@/lib/theme/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const initialState: ThemeActionState = {};
/** How long the Undo button stays visible after a save/reset, per the
 * spec's simplification note: "just hides the button after N seconds"
 * instead of a strict server-side TTL. */
const UNDO_VISIBLE_MS = 15_000;

function ColorField({
  colorKey,
  value,
  onChange,
}: {
  colorKey: keyof ThemeColors;
  value: string;
  onChange: (key: keyof ThemeColors, value: string) => void;
}) {
  const [raw, setRaw] = useState(value);
  const valid = isValidHexColor(raw);

  useEffect(() => setRaw(value), [value]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`color-${colorKey}`} className="text-xs">
        {THEME_COLOR_LABELS[colorKey]}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${THEME_COLOR_LABELS[colorKey]} — bảng màu`}
          value={valid ? raw : "#000000"}
          onChange={(e) => {
            setRaw(e.target.value);
            onChange(colorKey, e.target.value);
          }}
          className="h-8 w-8 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
        />
        <Input
          id={`color-${colorKey}`}
          value={raw}
          onChange={(e) => {
            const next = e.target.value;
            setRaw(next);
            if (isValidHexColor(next)) onChange(colorKey, next);
          }}
          className={cn("h-8 flex-1 font-mono text-xs", !valid && "border-danger text-danger")}
          spellCheck={false}
          maxLength={7}
        />
        <span
          className="h-8 w-8 shrink-0 rounded border border-border"
          style={{ backgroundColor: valid ? raw : "transparent" }}
          aria-hidden
        />
      </div>
      {!valid && <p className="text-xs text-danger">Mã hex không hợp lệ (ví dụ #2563EB).</p>}
    </div>
  );
}

function PreviewPanel({ colors }: { colors: ThemeColors }) {
  const s = {
    "--primary": colors.primary,
    "--primary-hover": colors.primaryHover,
    "--secondary": colors.secondary,
    "--accent": colors.accent,
    "--background": colors.background,
    "--surface": colors.surface,
    "--card": colors.card,
    "--text": colors.text,
    "--text-secondary": colors.textSecondary,
    "--border": colors.border,
    "--success": colors.success,
    "--warning": colors.warning,
    "--danger": colors.danger,
    "--info": colors.info,
  } as React.CSSProperties;

  return (
    <div
      style={s}
      className="space-y-4 rounded-lg border border-border bg-background p-4 text-text"
    >
      {/* mini navbar */}
      <div className="flex items-center justify-between rounded-md bg-surface px-3 py-2">
        <span className="font-heading text-sm font-semibold">Word Quest</span>
        <div className="flex gap-2">
          <span className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">
            Dashboard
          </span>
          <span className="rounded-md px-2 py-1 text-xs text-text-secondary">Bộ từ vựng</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* mini sidebar */}
        <div className="space-y-1 rounded-md bg-surface p-2">
          <p className="mb-1 text-xs font-medium text-text-secondary">Sidebar</p>
          <div className="rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground">
            Trang chủ
          </div>
          <div className="rounded px-2 py-1.5 text-xs text-text hover:bg-background">
            Lịch sử
          </div>
          <div className="rounded px-2 py-1.5 text-xs text-text-secondary">Cài đặt</div>
        </div>

        {/* card + form */}
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-text-secondary">Form mẫu</p>
          <div className="space-y-1">
            <label className="text-xs text-text">Tên học sinh</label>
            <input
              readOnly
              value="Nguyễn Văn A"
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text"
            />
          </div>
          <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover">
            Gửi
          </button>
        </div>
      </div>

      {/* badges + alert */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success">
          Thành công
        </span>
        <span className="rounded-full bg-warning/15 px-2 py-1 text-xs font-medium text-warning">
          Cảnh báo
        </span>
        <span className="rounded-full bg-danger/15 px-2 py-1 text-xs font-medium text-danger">
          Lỗi
        </span>
        <span className="rounded-full bg-info/15 px-2 py-1 text-xs font-medium text-info">
          Thông tin
        </span>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium text-text">
          Secondary
        </span>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-text-secondary">
          Accent viền
        </span>
      </div>

      <div className="rounded-md border border-border bg-card p-2 text-xs text-text">
        <strong className="text-info">Thông báo:</strong> Đây là bản xem trước — chưa lưu.
      </div>

      {/* mini table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <thead className="bg-surface text-text-secondary">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium">Học sinh</th>
              <th className="px-2 py-1.5 text-left font-medium">Điểm</th>
              <th className="px-2 py-1.5 text-left font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            <tr>
              <td className="px-2 py-1.5 text-text">An</td>
              <td className="px-2 py-1.5 text-text">42/50</td>
              <td className="px-2 py-1.5 text-success">Đạt</td>
            </tr>
            <tr>
              <td className="px-2 py-1.5 text-text">Bình</td>
              <td className="px-2 py-1.5 text-text">28/50</td>
              <td className="px-2 py-1.5 text-danger">Chưa đạt</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex items-center justify-center gap-1 text-xs">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded",
              n === 1 ? "bg-primary text-primary-foreground" : "bg-surface text-text-secondary"
            )}
          >
            {n}
          </span>
        ))}
      </div>

      {/* chart demo */}
      <div>
        <p className="mb-1 text-xs font-medium text-text-secondary">Chart demo</p>
        <div className="flex h-16 items-end gap-1.5 rounded-md border border-border bg-card p-2">
          {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-primary"
              style={{ height: `${h}%`, opacity: 0.55 + i * 0.06 }}
            />
          ))}
        </div>
      </div>

      {/* modal trigger */}
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-text"
          >
            Mở modal mẫu
          </button>
        </DialogTrigger>
        <DialogContent style={s}>
          <DialogHeader>
            <DialogTitle className="text-text">Modal xem trước</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Modal cũng dùng các token màu này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground">
              Đóng
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ThemeBuilderClient({
  initialTheme,
  presets,
  canUndoInitially,
}: {
  initialTheme: WebsiteTheme;
  presets: ThemePreset[];
  canUndoInitially: boolean;
}) {
  const { previewTheme, commitPreview, cancelPreview } = useTheme();
  const router = useRouter();

  const [light, setLight] = useState<ThemeColors>(initialTheme.light);
  const [dark, setDark] = useState<ThemeColors>(initialTheme.dark);
  const [canUndo, setCanUndo] = useState(canUndoInitially);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const contrastResults = useMemo(() => validateThemeContrast(light), [light]);
  const hardFail = contrastResults.some((r) => r.hardFail);

  useEffect(() => {
    previewTheme(light);
  }, [light, previewTheme]);

  // Leave the page without saving → drop the live preview overrides so the
  // committed theme's colors show again everywhere else in the app.
  useEffect(() => {
    return () => cancelPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  function scheduleUndoHide() {
    setCanUndo(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setCanUndo(false), UNDO_VISIBLE_MS);
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: ThemeActionState, formData: FormData) => {
      if (hardFail) {
        return { error: "Độ tương phản quá thấp — không thể lưu. Vui lòng chỉnh lại màu." };
      }
      const result = await saveThemeAction(_prev, formData);
      if (result.success) {
        commitPreview();
        toast.success("Đã lưu giao diện website.");
        scheduleUndoHide();
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
      return result;
    },
    initialState
  );

  function applyPreset(preset: ThemePreset) {
    setLight(preset.light);
    setDark(preset.dark);
    toast.message(`Đã xem trước theme "${preset.name}" — nhấn Lưu để áp dụng.`);
  }

  function handleReset() {
    setResetOpen(false);
    startTransition(async () => {
      const result = await resetThemeAction();
      if (result.success) {
        setLight(DEFAULT_THEME.light);
        setDark(DEFAULT_THEME.dark);
        commitPreview();
        toast.success("Đã đặt lại giao diện mặc định.");
        scheduleUndoHide();
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể đặt lại giao diện.");
      }
    });
  }

  function handleUndo() {
    startTransition(async () => {
      const result = await undoThemeAction();
      if (result.success) {
        toast.success("Đã hoàn tác thay đổi giao diện gần nhất.");
        setCanUndo(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Không thể hoàn tác.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold text-text">Giao diện website</h1>
          <p className="text-sm text-text-secondary">
            Tuỳ biến màu sắc toàn bộ website. Xem trước trực tiếp trước khi lưu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canUndo && (
            <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={isPending}>
              <Undo2 className="h-3.5 w-3.5" />
              Hoàn tác
            </Button>
          )}
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={isPending}>
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Đặt lại giao diện mặc định?</DialogTitle>
                <DialogDescription>
                  Toàn bộ màu sắc hiện tại sẽ được thay bằng giao diện mặc định của hệ thống. Bạn
                  vẫn có thể hoàn tác ngay sau đó.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetOpen(false)}>
                  Hủy
                </Button>
                <Button variant="destructive" onClick={handleReset} disabled={isPending}>
                  Đặt lại
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* presets */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-3 text-sm font-medium text-text">Theme có sẵn</p>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface"
              title={preset.name}
            >
              <span className="flex -space-x-1">
                {(["primary", "secondary", "accent"] as const).map((k) => (
                  <span
                    key={k}
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ backgroundColor: preset.light[k] }}
                  />
                ))}
              </span>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <form action={formAction} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium text-text">Màu sắc (chế độ sáng)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {THEME_COLOR_KEYS.map((key) => (
                <ColorField
                  key={key}
                  colorKey={key}
                  value={light[key]}
                  onChange={(k, v) => setLight((prev) => ({ ...prev, [k]: v }))}
                />
              ))}
            </div>
          </div>

          {contrastResults.some((r) => !r.passes) && (
            <Alert variant={hardFail ? "destructive" : "default"}>
              {hardFail ? (
                <AlertTriangle className="text-danger" />
              ) : (
                <Info className="text-warning" />
              )}
              <AlertTitle>
                {hardFail ? "Contrast quá thấp — không thể lưu" : "Contrast thấp"}
              </AlertTitle>
              <AlertDescription>
                <ul className="space-y-0.5">
                  {contrastResults
                    .filter((r) => !r.passes)
                    .map((r) => (
                      <li key={r.pair}>
                        {r.pair}: tỉ lệ {r.ratio}:1{" "}
                        {r.hardFail
                          ? `(< ${CONTRAST_HARD_FAIL_THRESHOLD}:1 — quá tệ, đề nghị chọn màu khác)`
                          : "(khuyến nghị ≥ 4.5:1)"}
                      </li>
                    ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* hidden fields carrying full theme payload to the server action */}
          {THEME_COLOR_KEYS.map((key) => (
            <input key={`l-${key}`} type="hidden" name={`light.${key}`} value={light[key]} />
          ))}
          {THEME_COLOR_KEYS.map((key) => (
            <input key={`d-${key}`} type="hidden" name={`dark.${key}`} value={dark[key]} />
          ))}
          <input type="hidden" name="fontSans" value={initialTheme.fontSans} />
          <input type="hidden" name="fontHeading" value={initialTheme.fontHeading} />
          <input type="hidden" name="radius" value={initialTheme.radius} />
          <input type="hidden" name="shadow" value={initialTheme.shadow} />
          <input type="hidden" name="spacingScale" value={initialTheme.spacingScale} />

          <Button type="submit" className="w-full gap-1.5" disabled={pending || hardFail}>
            <Check className="h-4 w-4" />
            {pending ? "Đang lưu..." : "Lưu giao diện"}
          </Button>
        </div>

        <div className="space-y-2 lg:sticky lg:top-20 lg:self-start">
          <p className="text-sm font-medium text-text">Xem trước trực tiếp</p>
          <PreviewPanel colors={light} />
        </div>
      </form>
    </div>
  );
}
