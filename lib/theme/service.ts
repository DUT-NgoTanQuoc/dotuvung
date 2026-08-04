/**
 * Theme Service — the only module that talks to Prisma for theme data.
 * Server-only: import exclusively from server actions / server components
 * (never from a "use client" file). There is no `server-only` package in
 * this project's dependencies, so this boundary is enforced by convention
 * rather than a build-time guard.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME } from "@/lib/theme/default-theme";
import type { ThemeColors, WebsiteTheme } from "@/lib/theme/tokens";
import {
  hasHardFailContrast,
  themeColorsSchema,
  themeExtrasSchema,
  themeTypographySchema,
} from "@/lib/theme/validation";

const THEME_ROW_ID = "default";

/** ThemeColors/snapshot objects are plain string-keyed records at runtime;
 * this just satisfies Prisma's InputJsonValue type for the Json columns. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export class ThemeValidationError extends Error {}
export class ThemeForbiddenError extends Error {}

export interface UpdateThemeInput {
  light: ThemeColors;
  dark: ThemeColors;
  fontSans: string;
  fontHeading: string;
  radius: string;
  shadow: string;
  spacingScale: string;
}

function toWebsiteTheme(row: {
  lightColors: unknown;
  darkColors: unknown;
  fontSans: string;
  fontHeading: string;
  radius: string;
  shadow: string;
  spacingScale: string;
  updatedAt: Date;
  updatedBy: string | null;
}): WebsiteTheme {
  return {
    light: themeColorsSchema.parse(row.lightColors),
    dark: themeColorsSchema.parse(row.darkColors),
    fontSans: row.fontSans,
    fontHeading: row.fontHeading,
    radius: row.radius,
    shadow: row.shadow,
    spacingScale: row.spacingScale,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export function getDefaultTheme(): WebsiteTheme {
  return DEFAULT_THEME;
}

/** Whether an Undo snapshot currently exists (used to show/hide the Undo button). */
export async function hasUndoAvailable(): Promise<boolean> {
  try {
    const row = await prisma.websiteTheme.findUnique({
      where: { id: THEME_ROW_ID },
      select: { previousTheme: true },
    });
    return !!row?.previousTheme;
  } catch {
    return false;
  }
}

/**
 * Returns the currently active theme. Falls back to DEFAULT_THEME if no row
 * exists yet (e.g. the migration ran but the app hasn't saved a theme, or
 * the migration hasn't run at all and the table doesn't exist) — this keeps
 * the app from crashing on first load.
 */
export async function getActiveTheme(): Promise<WebsiteTheme> {
  try {
    const row = await prisma.websiteTheme.findUnique({ where: { id: THEME_ROW_ID } });
    if (!row) return DEFAULT_THEME;
    return toWebsiteTheme(row);
  } catch {
    // Table missing / DB unreachable — never let theming break the site.
    return DEFAULT_THEME;
  }
}

function validateInput(input: UpdateThemeInput): void {
  const typography = themeTypographySchema.safeParse({
    fontSans: input.fontSans,
    fontHeading: input.fontHeading,
  });
  if (!typography.success) {
    throw new ThemeValidationError(typography.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }
  const extras = themeExtrasSchema.safeParse({
    radius: input.radius,
    shadow: input.shadow,
    spacingScale: input.spacingScale,
  });
  if (!extras.success) {
    throw new ThemeValidationError(extras.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.");
  }
  const light = themeColorsSchema.safeParse(input.light);
  if (!light.success) {
    throw new ThemeValidationError(
      `Màu sáng không hợp lệ: ${light.error.issues[0]?.message ?? ""}`
    );
  }
  const dark = themeColorsSchema.safeParse(input.dark);
  if (!dark.success) {
    throw new ThemeValidationError(`Màu tối không hợp lệ: ${dark.error.issues[0]?.message ?? ""}`);
  }
  if (hasHardFailContrast(input.light)) {
    throw new ThemeValidationError(
      "Độ tương phản (contrast) của bộ màu sáng quá thấp. Không thể lưu — vui lòng chọn màu khác."
    );
  }
  if (hasHardFailContrast(input.dark)) {
    throw new ThemeValidationError(
      "Độ tương phản (contrast) của bộ màu tối quá thấp. Không thể lưu — vui lòng chọn màu khác."
    );
  }
}

interface Actor {
  id: string;
  role: "SUPER_ADMIN" | "TEACHER";
}

function requireSuperAdmin(actor: Actor): void {
  if (actor.role !== "SUPER_ADMIN") {
    throw new ThemeForbiddenError("Chỉ Super Admin được chỉnh giao diện website.");
  }
}

/**
 * Validates and persists a new theme. Writes an audit row and stashes the
 * previous theme snapshot on the row itself so a single Undo can restore it.
 */
export async function updateTheme(
  input: UpdateThemeInput,
  actor: Actor,
  ip: string | null
): Promise<WebsiteTheme> {
  requireSuperAdmin(actor);
  validateInput(input);

  const existing = await prisma.websiteTheme.findUnique({ where: { id: THEME_ROW_ID } });
  const oldSnapshot = existing ? toWebsiteTheme(existing) : DEFAULT_THEME;

  const row = await prisma.websiteTheme.upsert({
    where: { id: THEME_ROW_ID },
    create: {
      id: THEME_ROW_ID,
      lightColors: toJson(input.light),
      darkColors: toJson(input.dark),
      fontSans: input.fontSans,
      fontHeading: input.fontHeading,
      radius: input.radius,
      shadow: input.shadow,
      spacingScale: input.spacingScale,
      previousTheme: toJson(oldSnapshot),
      updatedBy: actor.id,
    },
    update: {
      lightColors: toJson(input.light),
      darkColors: toJson(input.dark),
      fontSans: input.fontSans,
      fontHeading: input.fontHeading,
      radius: input.radius,
      shadow: input.shadow,
      spacingScale: input.spacingScale,
      previousTheme: toJson(oldSnapshot),
      updatedBy: actor.id,
    },
  });

  await prisma.themeAuditLog.create({
    data: {
      adminId: actor.id,
      action: "SAVE",
      oldTheme: toJson(oldSnapshot),
      newTheme: toJson({ light: input.light, dark: input.dark }),
      ip,
    },
  });

  return toWebsiteTheme(row);
}

/** Restores the hardcoded DEFAULT_THEME, logging the action. */
export async function resetTheme(actor: Actor, ip: string | null): Promise<WebsiteTheme> {
  requireSuperAdmin(actor);

  const existing = await prisma.websiteTheme.findUnique({ where: { id: THEME_ROW_ID } });
  const oldSnapshot = existing ? toWebsiteTheme(existing) : DEFAULT_THEME;

  const row = await prisma.websiteTheme.upsert({
    where: { id: THEME_ROW_ID },
    create: {
      id: THEME_ROW_ID,
      lightColors: toJson(DEFAULT_THEME.light),
      darkColors: toJson(DEFAULT_THEME.dark),
      fontSans: DEFAULT_THEME.fontSans,
      fontHeading: DEFAULT_THEME.fontHeading,
      radius: DEFAULT_THEME.radius,
      shadow: DEFAULT_THEME.shadow,
      spacingScale: DEFAULT_THEME.spacingScale,
      previousTheme: toJson(oldSnapshot),
      updatedBy: actor.id,
    },
    update: {
      lightColors: toJson(DEFAULT_THEME.light),
      darkColors: toJson(DEFAULT_THEME.dark),
      fontSans: DEFAULT_THEME.fontSans,
      fontHeading: DEFAULT_THEME.fontHeading,
      radius: DEFAULT_THEME.radius,
      shadow: DEFAULT_THEME.shadow,
      spacingScale: DEFAULT_THEME.spacingScale,
      previousTheme: toJson(oldSnapshot),
      updatedBy: actor.id,
    },
  });

  await prisma.themeAuditLog.create({
    data: {
      adminId: actor.id,
      action: "RESET",
      oldTheme: toJson(oldSnapshot),
      newTheme: toJson({ light: DEFAULT_THEME.light, dark: DEFAULT_THEME.dark }),
      ip,
    },
  });

  return toWebsiteTheme(row);
}

/**
 * Swaps the current theme with the `previousTheme` snapshot stored on the
 * row (set by the last save/reset). No-ops gracefully if there's nothing to
 * undo (e.g. undo was already used, or no theme has ever been saved).
 */
export async function undoTheme(actor: Actor, ip: string | null): Promise<WebsiteTheme> {
  requireSuperAdmin(actor);

  const existing = await prisma.websiteTheme.findUnique({ where: { id: THEME_ROW_ID } });
  if (!existing || !existing.previousTheme) {
    if (!existing) return DEFAULT_THEME;
    return toWebsiteTheme(existing);
  }

  const previous = themeColorsSchema.safeParse(
    (existing.previousTheme as { light?: unknown }).light
  );
  const previousDark = themeColorsSchema.safeParse(
    (existing.previousTheme as { dark?: unknown }).dark
  );
  if (!previous.success || !previousDark.success) {
    return toWebsiteTheme(existing);
  }

  const currentSnapshot = toWebsiteTheme(existing);

  const row = await prisma.websiteTheme.update({
    where: { id: THEME_ROW_ID },
    data: {
      lightColors: toJson(previous.data),
      darkColors: toJson(previousDark.data),
      previousTheme: toJson({ light: currentSnapshot.light, dark: currentSnapshot.dark }),
      updatedBy: actor.id,
    },
  });

  await prisma.themeAuditLog.create({
    data: {
      adminId: actor.id,
      action: "UNDO",
      oldTheme: toJson({ light: currentSnapshot.light, dark: currentSnapshot.dark }),
      newTheme: toJson({ light: previous.data, dark: previousDark.data }),
      ip,
    },
  });

  return toWebsiteTheme(row);
}
