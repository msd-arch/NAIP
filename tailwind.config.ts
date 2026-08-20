import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // one accent, one hue, four steps -- no per-module category colors anywhere
        accent: {
          100: "#cde9e6",
          300: "#8fd0c9",
          500: "#4fb8ad",
          700: "#1f7d74",
          DEFAULT: "#4fb8ad",
          soft: "rgba(79, 184, 173, 0.12)",
        },
        // reserved exclusively for genuinely urgent states (a fired trigger,
        // an active critical alert) -- never for routine category labeling
        critical: { DEFAULT: "#e5484d", soft: "rgba(229, 72, 77, 0.12)" },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        sans: ["'Public Sans'", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 4px 16px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
} satisfies Config;
