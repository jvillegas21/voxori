import type { Config } from 'tailwindcss';
import { baseConfig } from '@voxori/config/tailwind';

const config: Config = {
  ...baseConfig,
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
};

export default config;
