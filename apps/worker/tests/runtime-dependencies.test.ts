import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';

import type { ObjectStore } from '@sport-analytics/object-storage';
import { describe, expect, it } from 'vitest';

import { loadWorkerEnvironment } from '../src/config';
import { createRuntimeDependencies } from '../src/runtime-dependencies';

async function text(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
}

describe('worker runtime composition', () => {
  it('uses separate filesystem stores and the database transport for local development', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'worker-storage-'));
    const dependencies = createRuntimeDependencies(
      loadWorkerEnvironment({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/test',
        DATABASE_SSL_MODE: 'disable',
        DEPLOYMENT_ENVIRONMENT: 'test',
        WORKER_TRANSPORT_PROVIDER: 'database',
        OBJECT_STORAGE_PROVIDER: 'filesystem',
        OBJECT_STORAGE_FILESYSTEM_ROOT: root,
      }),
    );
    try {
      const ingestion = dependencies.ingestionObjectStorage as ObjectStore;
      await ingestion.write('same.json', Readable.from('ingestion'));
      await dependencies.releaseObjectStorage.write('same.json', Readable.from('release'));
      expect(await text(await ingestion.read('same.json'))).toBe('ingestion');
      expect(await text(await dependencies.releaseObjectStorage.read('same.json'))).toBe('release');
      expect(dependencies.useOutboxRelay).toBe(false);
      // Sent as a startup parameter, so every connection this pool opens is
      // bounded. Asserted on the pool configuration because the property is
      // what carries the bound to each connection.
      expect(dependencies.database.options.statement_timeout).toBe(60_000);
    } finally {
      await dependencies.close();
      await rm(root, { recursive: true, force: true });
    }
  });
});
