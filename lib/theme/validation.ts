import { z } from "zod";
import { THEME_COLOR_KEYS, type ThemeColors } from "@/lib/theme/tokens";

/** Matches #RGB or #RRGGBB (case-insensitive). */
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_RE.test(value.trim());
}

export const hexColorSchema = z
  .string()
  .trim()
  .regex(HEX_COLOR_RE, "Màu không hợp lệ. Dùng định dạng #RGB hoặc #RRGGBB.");

export const themeColorsSchema: z.ZodType<ThemeColors> = z.object(
  Object.fromEntries(THEME_COLOR_KEYS.map((key) => [key, hexColorSchema])) as Record<
    keyof ThemeColors,
    typeof hexColorSchema
  >
);

export const themeTypographySchema = z.object({
  fontSans: z.string().trim().min(1).max(60),
  fontHeading: z.string().trim().min(1).max(60),
});

export const themeExtrasSchema = z.object({
  radius: z.string().trim().min(1).max(20),
  shadow: z.string().trim().min(1).max(20),
  spacingScale: z.string().trim().min(1).max(20),
});

export const websiteThemeInputSchema = themeTypographySchema.extend({
  ...themeExtrasSchema.shape,
  light: themeColorsSchema,
  dark: themeColorsSchema,
});

export type WebsiteThemeInput = z.infer<typeof websiteThemeInputSchema>;

/* --------------------------------------------------------------------- */
/* WCAG contrast checking                                                 */
/* --------------------------------------------------------------------- */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** WCAG relative luminance of a single sRGB channel (0-255). */
function channelLuminance(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** WCAG 2.x relative luminance of a hex color, in [0, 1]. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
  );
}

/**
 * WCAG contrast ratio between two colors, in [1, 21]. Order of arguments
 * does not matter (the formula is symmetric).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pairs of (foreground, background) tokens that must remain readable. */
export const CONTRAST_PAIRS: readonly [keyof ThemeColors, keyof ThemeColors, string][] = [
  ["text", "background", "Chữ chính / Nền trang"],
  ["text", "surface", "Chữ chính / Nền khối"],
  ["text", "card", "Chữ chính / Thẻ"],
  ["textSecondary", "background", "Chữ phụ / Nền trang"],
  ["primary", "background", "Màu chính / Nền trang"],
];

/** Minimum ratio for normal text per WCAG AA — below this, warn. */
export const CONTRAST_WARN_THRESHOLD = 4.5;
/** Below this ratio the theme is "quá tệ" and must be rejected outright. */
export const CONTRAST_HARD_FAIL_THRESHOLD = 3;

export interface ContrastCheckResult {
  pair: string;
  foreground: keyof ThemeColors;
  background: keyof ThemeColors;
  ratio: number;
  passes: boolean;
  hardFail: boolean;
}

export function validateThemeContrast(colors: ThemeColors): ContrastCheckResult[] {
  return CONTRAST_PAIRS.map(([fg, bg, label]) => {
    const ratio = getContrastRatio(colors[fg], colors[bg]);
    return {
      pair: label,
      foreground: fg,
      background: bg,
      ratio: Math.round(ratio * 100) / 100,
      passes: ratio >= CONTRAST_WARN_THRESHOLD,
      hardFail: ratio < CONTRAST_HARD_FAIL_THRESHOLD,
    };
  });
}

export function hasHardFailContrast(colors: ThemeColors): boolean {
  return validateThemeContrast(colors).some((r) => r.hardFail);
}
