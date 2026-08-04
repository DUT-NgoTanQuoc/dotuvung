"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  ThemeForbiddenError,
  ThemeValidationError,
  getDefaultTheme,
  resetTheme,
  undoTheme,
  updateTheme,
  type UpdateThemeInput,
} from "@/lib/theme/service";
import { THEME_COLOR_KEYS, type ThemeColors } from "@/lib/theme/tokens";

export type ThemeActionState = { error?: string; success?: boolean };

const initialState: ThemeActionState = {};

async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}

async function requireSuperAdminSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ThemeForbiddenError("Bạn cần đăng nhập.");
  }
  return { id: session.user.id, role: session.user.role };
}

function parseColorsFromFormData(formData: FormData, prefix: "light" | "dark"): ThemeColors {
  const entries = THEME_COLOR_KEYS.map((key) => [
    key,
    String(formData.get(`${prefix}.${key}`) ?? ""),
  ]);
  return Object.fromEntries(entries) as unknown as ThemeColors;
}

export async function saveThemeAction(
  _prev: ThemeActionState,
  formData: FormData
): Promise<ThemeActionState> {
  try {
    const actor = await requireSuperAdminSession();
    const ip = await getClientIp();

    const input: UpdateThemeInput = {
      light: parseColorsFromFormData(formData, "light"),
      dark: parseColorsFromFormData(formData, "dark"),
      fontSans: String(formData.get("fontSans") ?? "Nunito"),
      fontHeading: String(formData.get("fontHeading") ?? "Fredoka"),
      radius: String(formData.get("radius") ?? "1rem"),
      shadow: String(formData.get("shadow") ?? "md"),
      spacingScale: String(formData.get("spacingScale") ?? "normal"),
    };

    await updateTheme(input, actor as { id: string; role: "SUPER_ADMIN" | "TEACHER" }, ip);

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/theme");
    return { success: true };
  } catch (err) {
    if (err instanceof ThemeForbiddenError) return { error: err.message };
    if (err instanceof ThemeValidationError) return { error: err.message };
    return { error: "Có lỗi xảy ra khi lưu giao diện. Vui lòng thử lại." };
  }
}

export async function resetThemeAction(): Promise<ThemeActionState> {
  try {
    const actor = await requireSuperAdminSession();
    const ip = await getClientIp();
    await resetTheme(actor as { id: string; role: "SUPER_ADMIN" | "TEACHER" }, ip);

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/theme");
    return { success: true };
  } catch (err) {
    if (err instanceof ThemeForbiddenError) return { error: err.message };
    return { error: "Có lỗi xảy ra khi đặt lại giao diện. Vui lòng thử lại." };
  }
}

export async function undoThemeAction(): Promise<ThemeActionState> {
  try {
    const actor = await requireSuperAdminSession();
    const ip = await getClientIp();
    await undoTheme(actor as { id: string; role: "SUPER_ADMIN" | "TEACHER" }, ip);

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/theme");
    return { success: true };
  } catch (err) {
    if (err instanceof ThemeForbiddenError) return { error: err.message };
    return { error: "Có lỗi xảy ra khi hoàn tác giao diện. Vui lòng thử lại." };
  }
}

export async function getDefaultThemeAction() {
  return getDefaultTheme();
}

export { initialState as themeActionInitialState };
