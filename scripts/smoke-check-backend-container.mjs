import { spawn } from 'node:child_process';

const HEALTH_URL = 'http://127.0.0.1:3000/api/v1/health';
const SERVICE_MARKER = 'sport-analytics-api';
const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 1_000;

function run(command, arguments_) {
  return new Promise((resolve, reject) => {
    let output = '';
    const process = spawn(command, arguments_, { stdio: ['ignore', 'pipe', 'pipe'] });

    for (const stream of [process.stdout, process.stderr]) {
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        output += chunk;
      });
    }

    process.once('error', reject);
    process.once('exit', (code) => {
      if (code === 0) {
        resolve(output.trim());
        return;
      }
      reject(
        new Error(`${command} ${arguments_.join(' ')} failed with exit code ${code}. ${output}`),
      );
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const [image] = process.argv.slice(2);

if (!image) {
  throw new Error('Usage: node scripts/smoke-check-backend-container.mjs <image>');
}

let containerId;
let cleanupPromise;

async function cleanup() {
  if (!containerId) return;

  const id = containerId;
  containerId = undefined;
  await run('docker', ['rm', '--force', id]).catch(() => undefined);
}

function cleanupOnce() {
  cleanupPromise ??= cleanup();
  return cleanupPromise;
}

function cleanUpOnSignal(signal, exitCode) {
  process.once(signal, () => {
    void cleanupOnce().finally(() => process.exit(exitCode));
  });
}

cleanUpOnSignal('SIGINT', 130);
cleanUpOnSignal('SIGTERM', 143);

async function printDiagnostics() {
  if (!containerId) return;

  const state = await run('docker', [
    'inspect',
    '--format',
    'status={{.State.Status}} exitCode={{.State.ExitCode}} running={{.State.Running}}',
    containerId,
  ]).catch(() => 'unavailable');
  console.error(`[smoke] backend container state: ${state}`);

  const logs = await run('docker', ['logs', containerId]).catch(() => 'unavailable');
  console.error(`[smoke] backend container logs:\n${logs}`);
}

const internalHealthCheck = [
  `fetch('${HEALTH_URL}', { signal: AbortSignal.timeout(5_000) })`,
  '.then(async (response) => {',
  '  const body = await response.text();',
  `  if (response.status !== 200 || !body.includes('${SERVICE_MARKER}')) {`,
  '    console.error(`Unexpected health response: HTTP ${response.status}`);',
  '    process.exitCode = 1;',
  '  }',
  '})',
  '.catch((error) => {',
  '  console.error(error instanceof Error ? error.message : String(error));',
  '  process.exitCode = 1;',
  '});',
].join('\n');

async function waitForHealth() {
  let lastError;

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await run('docker', ['exec', containerId, 'node', '-e', internalHealthCheck]);
      console.log(`[smoke] backend container image passed on attempt ${attempt}/${MAX_ATTEMPTS}.`);
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `[smoke] backend container image attempt ${attempt}/${MAX_ATTEMPTS} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS);
    }
  }

  throw new Error(
    `backend container image failed after ${MAX_ATTEMPTS} attempts. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

try {
  containerId = await run('docker', [
    'run',
    '--detach',
    '--name',
    `backend-container-smoke-${process.pid}-${Date.now()}`,
    '--env',
    'NODE_ENV=production',
    '--env',
    'PORT=3000',
    '--env',
    'DEPLOYMENT_ENVIRONMENT=dev',
    '--env',
    'CORS_ORIGINS=http://127.0.0.1',
    '--env',
    'SUPABASE_URL=https://example.invalid',
    '--env',
    'SUPABASE_PUBLISHABLE_KEY=container-smoke-key',
    '--env',
    'OBJECT_STORAGE_PROVIDER=azure',
    '--env',
    'AZURE_STORAGE_ACCOUNT_NAME=containersmoke',
    '--env',
    'AZURE_STORAGE_CONTAINER_NAME=staged-ingestion',
    '--env',
    'AZURE_STORAGE_RELEASE_CONTAINER_NAME=dataset-releases',
    image,
  ]);

  await waitForHealth();
} catch (error) {
  await printDiagnostics();
  throw error;
} finally {
  await cleanupOnce();
}
