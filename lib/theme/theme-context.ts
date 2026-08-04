"use client";

import { createContext } from "react";
import type { ThemeColors, WebsiteTheme } from "@/lib/theme/tokens";

/**
 * Shared context object used by theme-provider.tsx ("Theme Provider riêng")
 * and use-theme.ts ("Theme Hook riêng"). Kept in its own tiny module so
 * provider and hook stay separate files without a circular import.
 */
export interface ThemeContextValue {
  /** The server-committed theme (light + dark colors, typography, etc). */
  theme: WebsiteTheme;
  /** Live-apply a set of light-mode colors as CSS variables, without
   *  touching React state or re-rendering the tree — used for instant
   *  preview while editing in the Theme Builder. */
  previewTheme: (colors: ThemeColors) => void;
  /** Called after a successful save: drops the inline preview overrides so
   *  the freshly revalidated stylesheet values (from the new `theme` prop)
   *  take over. */
  commitPreview: () => void;
  /** Discards the live preview and restores the committed theme's colors. */
  cancelPreview: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
