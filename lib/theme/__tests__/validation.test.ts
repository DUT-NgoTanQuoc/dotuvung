import { describe, expect, it } from "vitest";
import {
  isValidHexColor,
  getContrastRatio,
  validateThemeContrast,
  hasHardFailContrast,
  CONTRAST_HARD_FAIL_THRESHOLD,
} from "@/lib/theme/validation";
import type { ThemeColors } from "@/lib/theme/tokens";

describe("isValidHexColor", () => {
  it("accepts 6-digit and 3-digit hex", () => {
    expect(isValidHexColor("#2563eb")).toBe(true);
    expect(isValidHexColor("#FFF")).toBe(true);
    expect(isValidHexColor("#abc123")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidHexColor("2563eb")).toBe(false);
    expect(isValidHexColor("#12345")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });
});

describe("getContrastRatio", () => {
  it("matches known WCAG reference ratios", () => {
    expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(getContrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(getContrastRatio("#000000", "#000000")).toBeCloseTo(1, 5);
  });

  it("is symmetric regardless of argument order", () => {
    const a = getContrastRatio("#2563eb", "#ffffff");
    const b = getContrastRatio("#ffffff", "#2563eb");
    expect(a).toBeCloseTo(b, 10);
  });

  it("computes a known mid-range ratio (#767676 on white ~= 4.5:1)", () => {
    expect(getContrastRatio("#767676", "#ffffff")).toBeCloseTo(4.5, 1);
  });
});

const GOOD_COLORS: ThemeColors = {
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  secondary: "#f6eebf",
  accent: "#38bdf8",
  background: "#ffffff",
  surface: "#f8fafc",
  card: "#ffffff",
  text: "#0f172a",
  textSecondary: "#475569",
  border: "#e2e8f0",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0284c7",
};

const BAD_COLORS: ThemeColors = {
  ...GOOD_COLORS,
  text: "#f5f5f5", // near-white text on near-white background/surface/card
  background: "#ffffff",
  surface: "#fafafa",
  card: "#fefefe",
};

describe("validateThemeContrast", () => {
  it("passes a well-designed color set", () => {
    const results = validateThemeContrast(GOOD_COLORS);
    expect(results.every((r) => r.passes)).toBe(true);
    expect(results.some((r) => r.hardFail)).toBe(false);
  });

  it("flags a bad text/background pair", () => {
    const results = validateThemeContrast(BAD_COLORS);
    const textBg = results.find((r) => r.foreground === "text" && r.background === "background");
    expect(textBg).toBeDefined();
    expect(textBg!.passes).toBe(false);
    expect(textBg!.ratio).toBeLessThan(CONTRAST_HARD_FAIL_THRESHOLD);
  });

  it("hasHardFailContrast reflects the hard-fail threshold", () => {
    expect(hasHardFailContrast(GOOD_COLORS)).toBe(false);
    expect(hasHardFailContrast(BAD_COLORS)).toBe(true);
  });
});
