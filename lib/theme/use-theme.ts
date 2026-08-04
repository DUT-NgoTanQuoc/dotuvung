"use client";

import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "@/lib/theme/theme-context";

/**
 * "Theme Hook riêng" — read the active theme and drive live preview.
 * Must be called under <ThemeProvider> (wired into app/layout.tsx).
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme() must be used within <ThemeProvider>.");
  }
  return ctx;
}
