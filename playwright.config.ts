import { defineConfig, devices } from '@playwright/test';

const testPort = process.env.PLAYWRIGHT_PORT ?? '4173';
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? `http://127.0.0.1:${testPort}`;
const reuseProductionBuild = process.env.PLAYWRIGHT_REUSE_BUILD === '1';
const ciWorkers = Number.parseInt(process.env.PLAYWRIGHT_WORKERS ?? '2', 10);

if (process.env.CI && (!Number.isInteger(ciWorkers) || ciWorkers < 1)) {
  throw new Error('PLAYWRIGHT_WORKERS must be a positive integer when CI is enabled.');
}

const previewCommand = `npm run preview --workspace=@sport-analytics/frontend -- --host 127.0.0.1 --port ${testPort}`;
const webServerCommand = reuseProductionBuild
  ? previewCommand
  : `npm run build --workspace=@sport-analytics/frontend && ${previewCommand}`;

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: process.env.CI ? 45_000 : 30_000,
  workers: process.env.CI ? ciWorkers : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: webServerCommand,
        env: {
          ...process.env,
          VITE_API_BASE_URL: process.env.PLAYWRIGHT_API_BASE_URL ?? 'http://localhost:3000/api/v1',
          VITE_SUPABASE_URL: 'https://e2e.supabase.co',
          VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-public-key',
        },
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'mobile-chromium',
      grep: /@mobile/,
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
});
