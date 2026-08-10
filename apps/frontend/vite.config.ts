import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const nodeMajorVersion = Number(process.versions.node.split('.')[0]);

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
    poolOptions: {
      forks: {
        // Node 25+ exposes Web Storage globals that conflict with Vitest's
        // jsdom environment. Disable Node's implementation in test workers
        // so jsdom provides the browser Storage API.
        execArgv: nodeMajorVersion >= 25 ? ['--no-experimental-webstorage'] : [],
      },
    },
  },
});
