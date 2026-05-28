import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@client': resolve(__dirname, 'src/client'),
      '@server': resolve(__dirname, 'src/server'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/shared/**/*.ts', 'src/server/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/client/**'],
    },
  },
});
