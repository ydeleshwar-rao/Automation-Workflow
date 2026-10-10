import type { Config } from "tailwindcss";

const cssVar = (name: string) => `hsl(var(${name}))`;

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Fonts ─────────────────────────────────────────────
      fontFamily: {
        sans:    ["var(--font-sans)"],
        mono:    ["var(--font-mono)"],
        heading: ["var(--font-heading)"],
      },

      // ── Font Sizes ────────────────────────────────────────
      fontSize: {
        xs:   ["0.75rem",  { lineHeight: "1rem" }],
        sm:   ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem",     { lineHeight: "1.5rem" }],
        lg:   ["1.125rem", { lineHeight: "1.75rem" }],
        xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
        "2xl":["1.5rem",   { lineHeight: "2rem" }],
        "3xl":["1.875rem", { lineHeight: "2.25rem" }],
        "4xl":["2.25rem",  { lineHeight: "2.5rem" }],
      },

      // ── Colors — all reference CSS variables ──────────────
      colors: {
        cream: {
          light: cssVar("--cream-light"),
          DEFAULT: cssVar("--cream"),
          dark: cssVar("--cream-dark"),
        },
        sand: {
          light: cssVar("--sand-light"),
          DEFAULT: cssVar("--sand"),
          dark: cssVar("--sand-dark"),
        },
        gold: {
          light: cssVar("--gold-light"),
          DEFAULT: cssVar("--gold"),
          dark: cssVar("--gold-dark"),
        },
        coral: {
          light: cssVar("--coral-light"),
          DEFAULT: cssVar("--coral"),
          dark: cssVar("--coral-dark"),
        },
        sage: {
          light: cssVar("--sage-light"),
          DEFAULT: cssVar("--sage"),
          dark: cssVar("--sage-dark"),
        },
        teal: {
          light: cssVar("--teal-light"),
          DEFAULT: cssVar("--teal"),
          dark: cssVar("--teal-dark"),
        },
        background: cssVar("--background"),
        foreground: cssVar("--foreground"),
        surface:    cssVar("--surface"),
        card: {
          DEFAULT:    cssVar("--card"),
          foreground: cssVar("--card-foreground"),
        },
        popover: {
          DEFAULT:    cssVar("--popover"),
          foreground: cssVar("--popover-foreground"),
        },
        primary: {
          DEFAULT:    cssVar("--primary"),
          foreground: cssVar("--primary-foreground"),
        },
        secondary: {
          DEFAULT:    cssVar("--secondary"),
          foreground: cssVar("--secondary-foreground"),
        },
        muted: {
          DEFAULT:    cssVar("--muted"),
          foreground: cssVar("--muted-foreground"),
        },
        accent: {
          DEFAULT:    cssVar("--accent"),
          foreground: cssVar("--accent-foreground"),
        },
        destructive: {
          DEFAULT:    cssVar("--destructive"),
          foreground: cssVar("--destructive-foreground"),
        },
        success: {
          DEFAULT:    cssVar("--success"),
          foreground: cssVar("--success-foreground"),
        },
        warning: {
          DEFAULT:    cssVar("--warning"),
          foreground: cssVar("--warning-foreground"),
        },
        info: {
          DEFAULT:    cssVar("--info"),
          foreground: cssVar("--info-foreground"),
        },
        border: cssVar("--border"),
        input:  cssVar("--input"),
        ring:   cssVar("--ring"),
        chart: {
          "1": cssVar("--chart-1"),
          "2": cssVar("--chart-2"),
          "3": cssVar("--chart-3"),
          "4": cssVar("--chart-4"),
          "5": cssVar("--chart-5"),
        },
      },

      // ── Border Radius ─────────────────────────────────────
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // ── Animations ────────────────────────────────────────
      keyframes: {
        fadeSlideIn: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-slide": "fadeSlideIn 0.5s ease forwards",
        shimmer:      "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
