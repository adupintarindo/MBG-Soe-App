import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Palette WFP × IFSR × FFI
        ink: "#0b2e4f",
        ink2: "#133a63",
        accent: "#f2a413",
        accent2: "#e67e22",
        ok: "#16a34a",
        warn: "#f59e0b",
        bad: "#dc2626",
        cream: "#fffaf0",
        paper: "#f8fafc"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 2px 14px rgba(11,46,79,.08)",
        cardlg: "0 8px 28px rgba(11,46,79,.12)"
      },
      borderRadius: {
        xl2: "14px"
      }
    }
  },
  plugins: []
};

export default config;
