import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { smokeCheck } from './smoke-check-deployment.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactEntryPoint = path.join(
  repositoryRoot,
  '.deployment',
  'backend',
  'apps',
  'backend',
  'dist',
  'index.js',
);
const port = 3100;
let processOutput = '';

const backend = spawn(process.execPath, [artifactEntryPoint], {
  cwd: repositoryRoot,
  env: {
    ...process.env,
    AZURE_STORAGE_ACCOUNT_NAME: 'deploymentstorage',
    AZURE_STORAGE_CONTAINER_NAME: 'deployment-smoke-check',
    AZURE_STORAGE_INGESTION_CONTAINER_NAME: 'deployment-smoke-check',
    AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
    DEPLOYMENT_ENVIRONMENT: 'dev',
    OBJECT_STORAGE_PROVIDER: 'azure',
    CORS_ORIGINS: `http://127.0.0.1:${port}`,
    NODE_ENV: 'production',
    PORT: String(port),
    SUPABASE_PUBLISHABLE_KEY: 'deployment-smoke-check-key',
    SUPABASE_URL: 'https://example.invalid',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

for (const stream of [backend.stdout, backend.stderr]) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    processOutput += chunk;
  });
}

const backendExited = new Promise((_, reject) => {
  backend.once('error', (error) => reject(error));
  backend.once('exit', (code, signal) => {
    reject(
      new Error(
        `Backend artifact exited before the health check passed (code ${code ?? 'none'}, signal ${signal ?? 'none'}).`,
      ),
    );
  });
});

async function stopBackend() {
  if (backend.exitCode !== null) {
    return;
  }

  backend.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => backend.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  if (backend.exitCode === null) {
    backend.kill('SIGKILL');
  }
}

try {
  await Promise.race([
    smokeCheck({
      attempts: 20,
      delayMs: 1_000,
      expectedText: 'sport-analytics-api',
      label: 'backend deployment artifact',
      timeoutMs: 5_000,
      url: `http://127.0.0.1:${port}/api/v1/health`,
    }),
    backendExited,
  ]);
} catch (error) {
  const output = processOutput.trim();

  if (output) {
    console.error(`[smoke] Backend artifact process output:\n${output}`);
  }

  throw error;
} finally {
  await stopBackend();
}
