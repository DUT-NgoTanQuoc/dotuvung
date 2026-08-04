import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_THEME } from "@/lib/theme/default-theme";
import type { ThemeColors } from "@/lib/theme/tokens";

const mockPrisma = {
  websiteTheme: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  themeAuditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

const { getActiveTheme, updateTheme, resetTheme, ThemeValidationError, ThemeForbiddenError } =
  await import("@/lib/theme/service");

const SUPER_ADMIN = { id: "admin-1", role: "SUPER_ADMIN" as const };
const TEACHER = { id: "teacher-1", role: "TEACHER" as const };

const VALID_COLORS: ThemeColors = { ...DEFAULT_THEME.light };
const VALID_DARK: ThemeColors = { ...DEFAULT_THEME.dark };

const BASE_INPUT = {
  light: VALID_COLORS,
  dark: VALID_DARK,
  fontSans: "Nunito",
  fontHeading: "Fredoka",
  radius: "1rem",
  shadow: "md",
  spacingScale: "normal",
};

function themeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "default",
    lightColors: VALID_COLORS,
    darkColors: VALID_DARK,
    fontSans: "Nunito",
    fontHeading: "Fredoka",
    radius: "1rem",
    shadow: "md",
    spacingScale: "normal",
    previousTheme: null,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    updatedBy: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getActiveTheme", () => {
  it("falls back to DEFAULT_THEME when no row exists", async () => {
    mockPrisma.websiteTheme.findUnique.mockResolvedValue(null);
    const theme = await getActiveTheme();
    expect(theme).toEqual(DEFAULT_THEME);
  });

  it("falls back to DEFAULT_THEME when the query throws (e.g. table missing pre-migration)", async () => {
    mockPrisma.websiteTheme.findUnique.mockRejectedValue(new Error("relation does not exist"));
    const theme = await getActiveTheme();
    expect(theme).toEqual(DEFAULT_THEME);
  });

  it("maps a stored row to WebsiteTheme", async () => {
    mockPrisma.websiteTheme.findUnique.mockResolvedValue(themeRow());
    const theme = await getActiveTheme();
    expect(theme.light).toEqual(VALID_COLORS);
    expect(theme.dark).toEqual(VALID_DARK);
  });
});

describe("updateTheme", () => {
  it("rejects a TEACHER actor", async () => {
    await expect(updateTheme(BASE_INPUT, TEACHER, null)).rejects.toBeInstanceOf(
      ThemeForbiddenError
    );
    expect(mockPrisma.websiteTheme.upsert).not.toHaveBeenCalled();
  });

  it("rejects invalid hex colors", async () => {
    const bad = { ...BASE_INPUT, light: { ...VALID_COLORS, primary: "not-a-color" } };
    await expect(updateTheme(bad, SUPER_ADMIN, null)).rejects.toBeInstanceOf(
      ThemeValidationError
    );
    expect(mockPrisma.websiteTheme.upsert).not.toHaveBeenCalled();
  });

  it("rejects a hard-fail contrast combination", async () => {
    const bad = {
      ...BASE_INPUT,
      light: {
        ...VALID_COLORS,
        text: "#f5f5f5",
        background: "#ffffff",
        surface: "#fafafa",
        card: "#fefefe",
      },
    };
    await expect(updateTheme(bad, SUPER_ADMIN, null)).rejects.toBeInstanceOf(
      ThemeValidationError
    );
    expect(mockPrisma.websiteTheme.upsert).not.toHaveBeenCalled();
  });

  it("accepts valid input, upserts the row, and writes an audit log", async () => {
    mockPrisma.websiteTheme.findUnique.mockResolvedValue(null);
    mockPrisma.websiteTheme.upsert.mockResolvedValue(themeRow({ updatedBy: SUPER_ADMIN.id }));

    const result = await updateTheme(BASE_INPUT, SUPER_ADMIN, "203.0.113.1");

    expect(mockPrisma.websiteTheme.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.themeAuditLog.create).toHaveBeenCalledTimes(1);
    const auditArgs = mockPrisma.themeAuditLog.create.mock.calls[0][0];
    expect(auditArgs.data.adminId).toBe(SUPER_ADMIN.id);
    expect(auditArgs.data.action).toBe("SAVE");
    expect(auditArgs.data.ip).toBe("203.0.113.1");
    expect(result.light).toEqual(VALID_COLORS);
  });
});

describe("resetTheme", () => {
  it("rejects a TEACHER actor", async () => {
    await expect(resetTheme(TEACHER, null)).rejects.toBeInstanceOf(ThemeForbiddenError);
    expect(mockPrisma.websiteTheme.upsert).not.toHaveBeenCalled();
  });

  it("restores DEFAULT_THEME and logs a RESET action", async () => {
    mockPrisma.websiteTheme.findUnique.mockResolvedValue(themeRow());
    mockPrisma.websiteTheme.upsert.mockResolvedValue(
      themeRow({ lightColors: DEFAULT_THEME.light, darkColors: DEFAULT_THEME.dark })
    );

    const result = await resetTheme(SUPER_ADMIN, null);

    expect(result.light).toEqual(DEFAULT_THEME.light);
    expect(result.dark).toEqual(DEFAULT_THEME.dark);
    const auditArgs = mockPrisma.themeAuditLog.create.mock.calls[0][0];
    expect(auditArgs.data.action).toBe("RESET");
  });
});
