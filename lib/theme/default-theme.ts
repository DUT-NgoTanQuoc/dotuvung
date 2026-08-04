import { getPresetById } from "@/lib/theme/presets";
import type { WebsiteTheme } from "@/lib/theme/tokens";

const fallback = getPresetById("ocean-blue")!;

/**
 * The hardcoded factory-default theme, used by `resetTheme()` and as the
 * fallback when no WebsiteTheme row exists yet (fresh DB / pre-migration).
 */
export const DEFAULT_THEME: WebsiteTheme = {
  light: fallback.light,
  dark: fallback.dark,
  fontSans: "Nunito",
  fontHeading: "Fredoka",
  radius: "1rem",
  shadow: "md",
  spacingScale: "normal",
};
