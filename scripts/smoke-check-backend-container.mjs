import { spawn } from 'node:child_process';

import { smokeCheck } from './smoke-check-deployment.mjs';

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

function publishedPort(value) {
  const match = value.match(/:(\d+)\s*$/m);
  if (!match)
    throw new Error(`Unable to determine the published backend container port from: ${value}`);
  return match[1];
}

const [image] = process.argv.slice(2);

if (!image) {
  throw new Error('Usage: node scripts/smoke-check-backend-container.mjs <image>');
}

let containerId;

try {
  containerId = await run('docker', [
    'run',
    '--detach',
    '--rm',
    '--publish',
    '127.0.0.1::3000',
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

  const port = publishedPort(await run('docker', ['port', containerId, '3000/tcp']));
  await smokeCheck({
    attempts: 20,
    delayMs: 1_000,
    expectedText: 'sport-analytics-api',
    label: 'backend container image',
    timeoutMs: 5_000,
    url: `http://127.0.0.1:${port}/api/v1/health`,
  });
} finally {
  if (containerId) {
    await run('docker', ['stop', '--time', '10', containerId]).catch(() => undefined);
  }
}
