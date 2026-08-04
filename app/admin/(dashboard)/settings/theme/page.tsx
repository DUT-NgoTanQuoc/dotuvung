import { auth } from "@/lib/auth";
import { getActiveTheme, hasUndoAvailable } from "@/lib/theme/service";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { ThemeBuilderClient } from "@/app/admin/(dashboard)/settings/theme/ThemeBuilderClient";

export const metadata = {
  title: "Giao diện website — Admin",
};

export default async function ThemeSettingsPage() {
  const session = await auth();

  if (session?.user?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-text-secondary">
        <p className="font-medium text-text">Không có quyền truy cập</p>
        <p className="mt-1 text-sm">Chỉ Super Admin được chỉnh giao diện website.</p>
      </div>
    );
  }

  const [theme, canUndo] = await Promise.all([getActiveTheme(), hasUndoAvailable()]);

  return (
    <ThemeBuilderClient
      key={theme.updatedAt?.toISOString() ?? "default"}
      initialTheme={theme}
      presets={THEME_PRESETS}
      canUndoInitially={canUndo}
    />
  );
}
