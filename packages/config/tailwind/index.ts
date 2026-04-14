import type { Config } from "tailwindcss";

export const baseConfig: Partial<Config> = {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0e9ff",
          500: "#3b5bdb",
          600: "#2f4ac7",
          700: "#2540b3",
          900: "#1a2d7a",
        },
      },
    },
  },
  plugins: [],
};
