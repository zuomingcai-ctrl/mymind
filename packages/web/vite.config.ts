import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          core: ['@mymind/core'],
          vendor: ['vue', 'pinia', 'vue-i18n'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@mymind/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
});
