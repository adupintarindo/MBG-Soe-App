import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // === Institutional palette WFP × IFSR × FFI (reference HTML) ===
        primary: "#0b2545",
        "primary-strong": "#061832",
        "primary-soft": "#e6edf7",
        "primary-2": "#13315c",
        accent: "#1d4e89",
        "accent-strong": "#0072bc",
        gold: "#c9a227",
        // semantic
        ok: "#16a34a",
        warn: "#f59e0b",
        bad: "#dc2626",
        // surfaces (light)
        paper: "#f5f7fb",
        cream: "#fffaf0",
        // === Dark mode surfaces ===
        "d-bg": "#0a1628",
        "d-surface": "#0f2240",
        "d-surface-2": "#13315c",
        "d-border": "#1d4e89",
        "d-text": "#e6edf7",
        "d-text-2": "#a8b8d0",
        // === Legacy aliases (keep existing pages compiling) ===
        ink: "#0b2545",
        ink2: "#13315c",
        accent2: "#0072bc"
      },
      backgroundImage: {
        "primary-gradient":
          "linear-gradient(135deg, #0b2545 0%, #1d4e89 100%)",
        "primary-gradient-dark":
          "linear-gradient(135deg, #1d4e89 0%, #0072bc 100%)"
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        mono: [
          "var(--font-inter)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      boxShadow: {
        card: "0 2px 14px rgba(11,37,69,.08)",
        cardlg: "0 8px 28px rgba(11,37,69,.14)",
        "card-dark": "0 2px 14px rgba(0,0,0,.35)",
        "cardlg-dark": "0 8px 28px rgba(0,0,0,.45)"
      },
      borderRadius: {
        xl2: "14px"
      }
    }
  },
  plugins: []
};

export default config;
