import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@voxori/database': path.resolve(__dirname, '../../packages/database/src'),
      '@voxori/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
});
