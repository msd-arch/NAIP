import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // primary accent: real crop/field green -- one hue, four steps, no
        // per-module category colors anywhere
        accent: {
          100: "#d9ead9",
          300: "#8fc78a",
          500: "#4a8f3c",
          700: "#2f5e26",
          DEFAULT: "#4a8f3c",
          soft: "rgba(74, 143, 60, 0.12)",
        },
        // secondary accent: soil/wheat brown-tan -- doubles as the visual
        // marker for the "model-estimated" data tier (green = real data,
        // brown = model estimate, gray = hand-mask fallback)
        secondary: {
          100: "#f0e0c0",
          300: "#d9b978",
          500: "#8a6d3f",
          700: "#5f4a2a",
          DEFAULT: "#8a6d3f",
          soft: "rgba(138, 109, 63, 0.14)",
        },
        // reserved exclusively for genuinely urgent states (a fired trigger,
        // an active critical alert) -- never for routine category labeling
        critical: { DEFAULT: "#c93b35", soft: "rgba(201, 59, 53, 0.12)" },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        sans: ["'Public Sans'", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 4px 16px rgba(43, 42, 36, 0.10)",
      },
    },
  },
  plugins: [],
} satisfies Config;
