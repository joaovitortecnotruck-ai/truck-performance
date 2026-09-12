import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0a0b",
          900: "#111113",
          850: "#16171a",
          800: "#1c1d21",
          700: "#26272c",
          600: "#3a3b41",
          500: "#5a5c64",
        },
        ink: {
          100: "#f5f5f6",
          300: "#c7c8cc",
          500: "#8b8d94",
        },
        accent: {
          DEFAULT: "#e11d2e",
          600: "#c9182a",
          700: "#a11423",
          glow: "#ff3b4a",
        },
        ok: "#2fb872",
        warn: "#e0a52c",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(225,29,46,0.4), 0 0 24px -4px rgba(225,29,46,0.5)",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
