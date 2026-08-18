import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#4da3ff",
          soft: "rgba(77, 163, 255, 0.15)",
          strong: "#2f8ce0",
        },
        warn: {
          DEFAULT: "#f59e0b",
          soft: "rgba(245, 158, 11, 0.15)",
        },
        danger: {
          DEFAULT: "#ef4444",
          soft: "rgba(239, 68, 68, 0.15)",
        },
      },
      fontFamily: {
        sans: [
          "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica",
          "Arial", "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 6px 20px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
