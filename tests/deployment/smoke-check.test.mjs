import assert from 'node:assert/strict';
import test from 'node:test';

import { smokeCheck } from '../../scripts/smoke-check-deployment.mjs';

const silentLogger = {
  error() {},
  log() {},
};

test('accepts a successful response containing the expected marker', async () => {
  const result = await smokeCheck(
    {
      attempts: 1,
      delayMs: 1,
      expectedText: 'sport-analytics-api',
      label: 'backend health',
      timeoutMs: 100,
      url: 'https://example.test/api/v1/health',
    },
    {
      fetchRequest: async () =>
        new Response('{"status":"ok","service":"sport-analytics-api"}', { status: 200 }),
      logger: silentLogger,
    },
  );

  assert.deepEqual(result, { attempts: 1, status: 200 });
});

test('retries a failed response before succeeding', async () => {
  let requests = 0;
  let waits = 0;

  const result = await smokeCheck(
    {
      attempts: 2,
      delayMs: 1,
      label: 'frontend',
      timeoutMs: 100,
      url: 'https://example.test',
    },
    {
      fetchRequest: async () => {
        requests += 1;
        return requests === 1
          ? new Response('warming up', { status: 503 })
          : new Response("<title>Stat'sTheGame</title>", { status: 200 });
      },
      logger: silentLogger,
      wait: async () => {
        waits += 1;
      },
    },
  );

  assert.deepEqual(result, { attempts: 2, status: 200 });
  assert.equal(waits, 1);
});

test('reports the final HTTP failure after exhausting retries', async () => {
  await assert.rejects(
    smokeCheck(
      {
        attempts: 2,
        delayMs: 1,
        label: 'backend health',
        timeoutMs: 100,
        url: 'https://example.test/api/v1/health',
      },
      {
        fetchRequest: async () => new Response('service unavailable', { status: 503 }),
        logger: silentLogger,
        wait: async () => {},
      },
    ),
    /backend health failed after 2 attempts.*HTTP 503.*service unavailable/,
  );
});

test('rejects unsupported URL protocols before making a request', async () => {
  await assert.rejects(
    smokeCheck({
      attempts: 1,
      delayMs: 1,
      label: 'invalid target',
      timeoutMs: 100,
      url: 'file:///tmp/index.html',
    }),
    /must use HTTP or HTTPS/,
  );
});
