import type { Config } from "tailwindcss";

export const baseConfig: Partial<Config> = {
  content: [],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Josefin Sans', 'system-ui', 'sans-serif'],
        heading: ['Cinzel', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0f766e',
          700: '#0d9488',
          900: '#134e4a',
        },
      },
    },
  },
  plugins: [],
};
