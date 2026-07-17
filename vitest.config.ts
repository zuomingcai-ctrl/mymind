import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['packages/web/**', 'jsdom'],
    ],
    include: ['packages/**/__tests__/**/*.test.ts', 'test-utils/**/__tests__/**/*.test.ts', 'packages/desktop/__tests__/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@mymind/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@mymind/test-utils': path.resolve(__dirname, 'test-utils/src/index.ts'),
    },
  },
});
