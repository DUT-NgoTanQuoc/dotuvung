import { describe, expect, it } from "vitest";
import { THEME_PRESETS } from "@/lib/theme/presets";
import { hasHardFailContrast } from "@/lib/theme/validation";
import { themeColorsSchema } from "@/lib/theme/validation";

describe("THEME_PRESETS", () => {
  it("ships at least 10 presets", () => {
    expect(THEME_PRESETS.length).toBeGreaterThanOrEqual(10);
  });

  it("every preset has unique id and name", () => {
    const ids = THEME_PRESETS.map((p) => p.id);
    const names = THEME_PRESETS.map((p) => p.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(THEME_PRESETS.map((p) => [p.name, p] as const))(
    "%s: light and dark colors are valid hex and structurally complete",
    (_name, preset) => {
      expect(() => themeColorsSchema.parse(preset.light)).not.toThrow();
      expect(() => themeColorsSchema.parse(preset.dark)).not.toThrow();
    }
  );

  it.each(THEME_PRESETS.map((p) => [p.name, p] as const))(
    "%s: does not hard-fail contrast validation in light mode",
    (_name, preset) => {
      expect(hasHardFailContrast(preset.light)).toBe(false);
    }
  );

  it.each(THEME_PRESETS.map((p) => [p.name, p] as const))(
    "%s: does not hard-fail contrast validation in dark mode",
    (_name, preset) => {
      expect(hasHardFailContrast(preset.dark)).toBe(false);
    }
  );
});
