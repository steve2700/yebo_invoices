import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "hsl(var(--paper) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        lime: "hsl(var(--lime) / <alpha-value>)",
        orange: "hsl(var(--orange) / <alpha-value>)",
        yebo: { DEFAULT: "#0F8A5F", deep: "#0C3B2E", sun: "#F2B21B", chalk: "#F2F6F3" },
      },
      fontFamily: { sans: ["var(--font-display)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
