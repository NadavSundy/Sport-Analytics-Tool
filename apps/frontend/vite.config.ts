import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@sport-analytics/contracts'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /packages[\\/]contracts/],
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
  },
});
