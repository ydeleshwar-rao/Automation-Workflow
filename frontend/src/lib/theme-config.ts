// ============================================================
// GLOBAL THEME CONFIGURATION — Single Source of Truth
// ============================================================
// All colours, fonts, and design tokens live here.
// • tailwind.config.ts imports font/radius values from here.
// • globals.css CSS variables must stay in sync with the
//   color values below (CSS cannot import TS at build time).
// • Use the exported helpers for any programmatic color use.
// ============================================================

// ── Typography ───────────────────────────────────────────────
// These reference the CSS variables set by next/font in layout.tsx
export const fonts = {
  sans:    "var(--font-sans)",
  mono:    "var(--font-mono)",
  heading: "var(--font-heading)",
} as const;

// ── Font Size Scale ──────────────────────────────────────────
export const fontSizes: Record<string, [string, { lineHeight: string }]> = {
  xs:   ["0.75rem",  { lineHeight: "1rem" }],
  sm:   ["0.875rem", { lineHeight: "1.25rem" }],
  base: ["1rem",     { lineHeight: "1.5rem" }],
  lg:   ["1.125rem", { lineHeight: "1.75rem" }],
  xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
  "2xl":["1.5rem",   { lineHeight: "2rem" }],
  "3xl":["1.875rem", { lineHeight: "2.25rem" }],
  "4xl":["2.25rem",  { lineHeight: "2.5rem" }],
};

// ── Border Radius ────────────────────────────────────────────
export const radius = "0.5rem";

// ── Color Tokens (HSL values: "H S% L%") ────────────────────
// These MUST match the CSS variables in globals.css
export const colors = {
  palette: {
    cream: { light: "42 100% 94%", DEFAULT: "42 100% 86%", dark: "37 87% 78%" },
    sand:  { light: "34 71% 82%", DEFAULT: "34 74% 75%", dark: "31 60% 62%" },
    gold:  { light: "43 89% 78%", DEFAULT: "43 86% 67%", dark: "39 70% 50%" },
    coral: { light: "6 86% 79%", DEFAULT: "6 86% 71%", dark: "5 66% 56%" },
    sage:  { light: "182 19% 62%", DEFAULT: "183 18% 51%", dark: "184 22% 38%" },
    teal:  { light: "191 56% 28%", DEFAULT: "192 76% 18%", dark: "194 80% 11%" },
  },
  light: {
    background:             "42 100% 94%",
    foreground:             "194 80% 11%",
    card:                   "42 100% 96%",
    cardForeground:         "194 80% 11%",
    popover:                "42 100% 96%",
    popoverForeground:      "194 80% 11%",
    primary:                "192 76% 18%",
    primaryForeground:      "0 0% 100%",
    secondary:              "34 74% 75%",
    secondaryForeground:    "194 80% 11%",
    muted:                  "40 82% 88%",
    mutedForeground:        "184 22% 38%",
    accent:                 "43 86% 67%",
    accentForeground:       "194 80% 11%",
    destructive:            "6 86% 71%",
    destructiveForeground:  "0 0% 98%",
    success:                "183 18% 51%",
    successForeground:      "0 0% 100%",
    warning:                "39 70% 50%",
    warningForeground:      "194 80% 11%",
    info:                   "191 56% 28%",
    infoForeground:         "0 0% 100%",
    border:                 "192 76% 18%",
    input:                  "192 76% 18%",
    ring:                   "6 86% 71%",
    surface:                "42 100% 86%",
  },
  dark: {
    background:             "194 80% 11%",
    foreground:             "42 100% 94%",
    card:                   "192 76% 18%",
    cardForeground:         "42 100% 94%",
    popover:                "192 76% 18%",
    popoverForeground:      "42 100% 94%",
    primary:                "43 86% 67%",
    primaryForeground:      "194 80% 11%",
    secondary:              "191 56% 28%",
    secondaryForeground:    "42 100% 94%",
    muted:                  "192 56% 20%",
    mutedForeground:        "182 19% 62%",
    accent:                 "6 86% 71%",
    accentForeground:       "0 0% 100%",
    destructive:            "5 66% 56%",
    destructiveForeground:  "210 40% 98%",
    success:                "182 19% 62%",
    successForeground:      "0 0% 100%",
    warning:                "43 86% 67%",
    warningForeground:      "194 80% 11%",
    info:                   "34 74% 75%",
    infoForeground:         "0 0% 100%",
    border:                 "42 100% 86%",
    input:                  "42 100% 86%",
    ring:                   "43 86% 67%",
    surface:                "194 80% 11%",
  },
  charts: {
    light: { 1: "43 86% 67%", 2: "6 86% 71%", 3: "183 18% 51%", 4: "192 76% 18%", 5: "34 74% 75%" },
    dark:  { 1: "43 86% 67%", 2: "6 86% 71%", 3: "182 19% 62%", 4: "34 74% 75%", 5: "37 87% 78%" },
  },
} as const;

// ── Helper ───────────────────────────────────────────────────
// Get a CSS variable reference for Tailwind
export const cssVar = (name: string) => `hsl(var(${name}))`;

// Re-export as a combined object for convenience
export const themeConfig = { fonts, fontSizes, radius, colors } as const;
export type ThemeColors = typeof colors.light;
