import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { yebo: "#0F8A5F" } } },
  plugins: [],
} satisfies Config;
