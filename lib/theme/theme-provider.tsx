"use client";

import { useCallback, useMemo } from "react";
import { ThemeContext } from "@/lib/theme/theme-context";
import { THEME_CSS_VAR_MAP, type ThemeColors, type WebsiteTheme } from "@/lib/theme/tokens";

function colorDeclarations(colors: ThemeColors): string {
  return Object.entries(THEME_CSS_VAR_MAP)
    .map(([key, cssVar]) => `${cssVar}: ${colors[key as keyof ThemeColors]};`)
    .join(" ");
}

function buildCssText(theme: WebsiteTheme): string {
  return [
    `:root { ${colorDeclarations(theme.light)} --radius: ${theme.radius}; }`,
    `.dark { ${colorDeclarations(theme.dark)} }`,
  ].join("\n");
}

/**
 * "Theme Provider riêng" — a small client component that injects the active
 * theme as a <style> tag (server-renderable, so there's no flash of
 * unstyled/default colors) and exposes the preview API via context.
 *
 * Deliberately does NOT keep preview colors in React state: previewTheme()
 * writes straight to `document.documentElement` inline styles, which win
 * over the <style> tag's :root rule by CSS specificity. That means calling
 * previewTheme() never triggers a React re-render of the app tree — only
 * components that actually call useTheme() re-render when `theme` itself
 * changes (e.g. after a save + router.refresh()).
 */
export function ThemeProvider({
  theme,
  children,
}: {
  theme: WebsiteTheme;
  children: React.ReactNode;
}) {
  const cssText = useMemo(() => buildCssText(theme), [theme]);

  const previewTheme = useCallback((colors: ThemeColors) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    for (const [key, cssVar] of Object.entries(THEME_CSS_VAR_MAP)) {
      root.style.setProperty(cssVar, colors[key as keyof ThemeColors]);
    }
  }, []);

  const cancelPreview = useCallback(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    for (const cssVar of Object.values(THEME_CSS_VAR_MAP)) {
      root.style.removeProperty(cssVar);
    }
  }, []);

  const commitPreview = useCallback(() => {
    // After a successful save the caller triggers revalidatePath/router.refresh(),
    // which re-fetches the theme on the server and re-renders this provider
    // with a new `theme` prop (and thus a new <style> tag). Clearing the
    // inline overrides here lets that fresh stylesheet rule take over.
    cancelPreview();
  }, [cancelPreview]);

  const value = useMemo(
    () => ({ theme, previewTheme, commitPreview, cancelPreview }),
    [theme, previewTheme, commitPreview, cancelPreview]
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* eslint-disable-next-line react/no-danger */}
      <style id="website-theme-vars" dangerouslySetInnerHTML={{ __html: cssText }} />
      {children}
    </ThemeContext.Provider>
  );
}
