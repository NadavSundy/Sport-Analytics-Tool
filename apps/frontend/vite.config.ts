import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const nodeMajorVersion = Number(process.versions.node.split('.')[0]);

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // The contracts workspace publishes compiled CommonJS. Rebuild its Vite
    // optimization on each development start so newly exported API contracts
    // cannot be hidden by an optimization produced from an older dist build.
    force: true,
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
    // Vitest 4 removed poolOptions; worker execArgv is now a top-level test option.
    // Node 25+ exposes Web Storage globals that conflict with Vitest's jsdom
    // environment, so disable Node's implementation in test workers and let
    // jsdom provide the browser Storage API.
    execArgv: nodeMajorVersion >= 25 ? ['--no-experimental-webstorage'] : [],
  },
});
