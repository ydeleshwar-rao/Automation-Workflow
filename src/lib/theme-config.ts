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
  light: {
    background:             "0 0% 100%",
    foreground:             "222 47% 11%",
    card:                   "0 0% 100%",
    cardForeground:         "222 47% 11%",
    popover:                "0 0% 100%",
    popoverForeground:      "222 47% 11%",
    primary:                "244 75% 59%",   // Brand purple
    primaryForeground:      "0 0% 100%",
    secondary:              "210 40% 96%",
    secondaryForeground:    "222 47% 11%",
    muted:                  "210 40% 96%",
    mutedForeground:        "215 16% 47%",
    accent:                 "244 100% 96%",  // Light purple tint
    accentForeground:       "244 50% 38%",
    destructive:            "0 84% 60%",
    destructiveForeground:  "0 0% 98%",
    success:                "142 71% 45%",
    successForeground:      "0 0% 100%",
    warning:                "38 92% 50%",
    warningForeground:      "0 0% 100%",
    info:                   "199 89% 48%",
    infoForeground:         "0 0% 100%",
    border:                 "214 32% 91%",
    input:                  "214 32% 91%",
    ring:                   "244 75% 59%",
    surface:                "30 20% 97%",    // Warm page bg
  },
  dark: {
    background:             "222 47% 8%",
    foreground:             "210 40% 98%",
    card:                   "222 47% 11%",
    cardForeground:         "210 40% 98%",
    popover:                "222 47% 11%",
    popoverForeground:      "210 40% 98%",
    primary:                "244 75% 59%",   // Purple stays vivid
    primaryForeground:      "0 0% 100%",
    secondary:              "217 33% 17%",
    secondaryForeground:    "210 40% 98%",
    muted:                  "217 33% 17%",
    mutedForeground:        "215 20% 65%",
    accent:                 "244 30% 22%",   // Dark purple tint
    accentForeground:       "244 100% 90%",
    destructive:            "0 63% 31%",
    destructiveForeground:  "210 40% 98%",
    success:                "142 71% 45%",
    successForeground:      "0 0% 100%",
    warning:                "38 92% 50%",
    warningForeground:      "0 0% 100%",
    info:                   "199 89% 48%",
    infoForeground:         "0 0% 100%",
    border:                 "217 33% 20%",
    input:                  "217 33% 20%",
    ring:                   "244 75% 59%",
    surface:                "222 47% 6%",
  },
  charts: {
    light: { 1: "12 76% 61%",  2: "173 58% 39%", 3: "197 37% 24%", 4: "43 74% 66%",  5: "27 87% 67%"  },
    dark:  { 1: "220 70% 50%", 2: "160 60% 45%", 3: "30 80% 55%",  4: "280 65% 60%", 5: "340 75% 55%" },
  },
} as const;

// ── Helper ───────────────────────────────────────────────────
// Get a CSS variable reference for Tailwind
export const cssVar = (name: string) => `hsl(var(${name}))`;

// Re-export as a combined object for convenience
export const themeConfig = { fonts, fontSizes, radius, colors } as const;
export type ThemeColors = typeof colors.light;
