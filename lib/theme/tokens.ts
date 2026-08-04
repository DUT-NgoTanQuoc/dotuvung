/**
 * Canonical theme token types shared by the Theme Provider, Theme Service,
 * Theme Hook, and Theme Builder UI. This is the single source of truth for
 * "which color tokens exist" and "which CSS variable each maps to".
 */

export type ThemeMode = "light" | "dark";

/** The ~12 color tokens exposed in the Theme Builder, per spec. */
export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export const THEME_COLOR_KEYS: readonly (keyof ThemeColors)[] = [
  "primary",
  "primaryHover",
  "secondary",
  "accent",
  "background",
  "surface",
  "card",
  "text",
  "textSecondary",
  "border",
  "success",
  "warning",
  "danger",
  "info",
];

/** Human-readable Vietnamese labels for the Theme Builder form. */
export const THEME_COLOR_LABELS: Record<keyof ThemeColors, string> = {
  primary: "Màu chính (Primary)",
  primaryHover: "Màu chính khi hover",
  secondary: "Màu phụ (Secondary)",
  accent: "Màu nhấn (Accent)",
  background: "Nền trang (Background)",
  surface: "Nền khối (Surface)",
  card: "Nền thẻ (Card)",
  text: "Chữ chính (Text)",
  textSecondary: "Chữ phụ (Text secondary)",
  border: "Viền (Border)",
  success: "Thành công (Success)",
  warning: "Cảnh báo (Warning)",
  danger: "Nguy hiểm (Danger)",
  info: "Thông tin (Info)",
};

/** Maps each color token to the CSS custom property it controls. */
export const THEME_CSS_VAR_MAP: Record<keyof ThemeColors, string> = {
  primary: "--primary",
  primaryHover: "--primary-hover",
  secondary: "--secondary",
  accent: "--accent",
  background: "--background",
  surface: "--surface",
  card: "--card",
  text: "--text",
  textSecondary: "--text-secondary",
  border: "--border",
  success: "--success",
  warning: "--warning",
  danger: "--danger",
  info: "--info",
};

export interface ThemeTypography {
  fontSans: string;
  fontHeading: string;
}

export interface ThemeExtras {
  radius: string;
  shadow: string;
  spacingScale: string;
}

/** Full theme shape used across the domain layer (light + dark colors). */
export interface WebsiteTheme extends ThemeTypography, ThemeExtras {
  light: ThemeColors;
  dark: ThemeColors;
  updatedAt?: Date;
  updatedBy?: string | null;
}

/** A named preset — just the color data, no behavior. */
export interface ThemePreset {
  id: string;
  name: string;
  light: ThemeColors;
  dark: ThemeColors;
}
