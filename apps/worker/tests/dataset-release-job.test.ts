import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';

import type { ObjectStore } from '@sport-analytics/object-storage';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { createDatasetReleaseJobHandler } from '../src/dataset-release-job';
import type { Logger } from '../src/logger';

class MemoryStore implements ObjectStore {
  objects = new Map<string, Buffer>();
  deleted: string[] = [];
  failWrite = false;
  async write(key: string, source: Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of source) {
      chunks.push(Buffer.from(chunk));
      if (this.failWrite) throw new Error('write interrupted');
    }
    this.objects.set(key, Buffer.concat(chunks));
    return { versionId: null };
  }
  async read(key: string) {
    const { Readable } = await import('node:stream');
    return Readable.from(this.objects.get(key)!);
  }
  async delete(key: string) {
    this.deleted.push(key);
    this.objects.delete(key);
  }
}

class CountingStore implements ObjectStore {
  bytes = 0;
  async write(_key: string, source: Readable) {
    for await (const chunk of source) this.bytes += Buffer.byteLength(chunk);
    return { versionId: null };
  }
  async read() {
    throw new Error('not retained');
  }
  async delete() {}
}

function fakeDatabase(
  options: {
    failPage?: boolean;
    failMetadata?: boolean;
    state?: string;
    leaseOwner?: string;
    releaseRace?: boolean;
    eventCount?: number;
    pageSize?: number;
  } = {},
) {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  let page = 0;
  const query = vi.fn(async (text: string, values?: unknown[]) => {
    calls.push({ text, values });
    const sql = text.replace(/\s+/g, ' ').toLowerCase();
    if (sql.includes('select j.state::text'))
      return {
        rows: [
          {
            state: options.state ?? 'queued',
            attemptCount: 0,
            maxAttempts: 5,
            leaseOwner: options.leaseOwner ?? null,
            leaseExpiresAt: options.leaseOwner ? new Date(Date.now() + 60_000) : null,
            storageProvider: 'filesystem',
            attemptStorageKey: null,
          },
        ],
        rowCount: 1,
      };
    if (sql.includes('select snapshot_id::text'))
      return { rows: [{ snapshotId: null }], rowCount: 1 };
    if (sql.includes('from dataset_release_snapshot_event')) {
      page += 1;
      if (options.failPage && page === 2) throw new Error('database page failed');
      if (options.eventCount !== undefined) {
        const size = options.pageSize ?? 10_000;
        const start = (page - 1) * size;
        const count = Math.max(0, Math.min(size, options.eventCount - start));
        return {
          rows: Array.from({ length: count }, (_, index) => {
            const id = String(start + index + 1);
            return {
              event: { eventId: id },
              fixtureId: id,
              inningsOrdinal: 0,
              sequenceNumber: 1,
              eventId: id,
            };
          }),
          rowCount: count,
        };
      }
      return page === 1
        ? {
            rows: [
              {
                event: { eventId: '1' },
                fixtureId: '1',
                inningsOrdinal: 0,
                sequenceNumber: 1,
                eventId: '1',
              },
              {
                event: { eventId: '2' },
                fixtureId: '1',
                inningsOrdinal: 0,
                sequenceNumber: 2,
                eventId: '2',
              },
            ],
            rowCount: 2,
          }
        : {
            rows: [
              {
                event: { eventId: '3' },
                fixtureId: '2',
                inningsOrdinal: 0,
                sequenceNumber: 1,
                eventId: '3',
              },
            ],
            rowCount: 1,
          };
    }
    if (sql.includes('insert into dataset_release ')) {
      if (options.failMetadata) throw new Error('metadata insert failed');
      return options.releaseRace
        ? { rows: [], rowCount: 0 }
        : { rows: [{ releaseId: '22222222-2222-4222-8222-222222222222' }], rowCount: 1 };
    }
    if (sql.includes('select release_id::text as "releaseid"'))
      return { rows: [{ releaseId: '33333333-3333-4333-8333-333333333333' }], rowCount: 1 };
    return { rows: [], rowCount: 1 };
  });
  const client = { query, release: vi.fn() };
  return { pool: { query, connect: vi.fn(async () => client) } as unknown as Pool, calls };
}

const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const message = {
  messageId: 'message',
  deliveryCount: 1,
  body: {
    type: 'dataset-release.generate',
    version: 1,
    jobId: '11111111-1111-4111-8111-111111111111',
    releaseVersion: '2026.09.1',
    deploymentEnvironment: 'test',
  },
};

describe('dataset release worker job', () => {
  it('streams deterministic multi-page JSON, checksum and completion metadata', async () => {
    const database = fakeDatabase();
    const store = new MemoryStore();
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      pageSize: 2,
    }).handler;
    await handler(message, new AbortController().signal);
    const artifact = [...store.objects.values()][0]!;
    expect(JSON.parse(artifact.toString()).events).toEqual([
      { eventId: '1' },
      { eventId: '2' },
      { eventId: '3' },
    ]);
    const insert = database.calls.find((call) =>
      call.text.includes('INSERT INTO dataset_release '),
    );
    expect(insert?.values?.[4]).toBe(3);
    expect(insert?.values?.[9]).toBe(createHash('sha256').update(artifact).digest('hex'));
    expect(database.calls.some((call) => call.text.includes("state='succeeded'"))).toBe(true);
    expect(database.calls.filter((call) => call.text.includes('last_fixture_id=$6'))).toHaveLength(
      2,
    );
  });

  it('materializes one release snapshot before paging so a mid-generation correction cannot mix revisions', async () => {
    const database = fakeDatabase();
    const store = new MemoryStore();
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      pageSize: 2,
    }).handler;

    await handler(message, new AbortController().signal);

    expect(
      database.calls.some((call) =>
        call.text.includes('INSERT INTO dataset_release_snapshot_event'),
      ),
    ).toBe(true);
    expect(
      database.calls.filter((call) => call.text.includes('FROM dataset_release_snapshot_event')),
    ).toHaveLength(2);
  });

  it.each([
    ['database page failure', { failPage: true }],
    ['metadata insert failure', { failMetadata: true }],
  ])('records failure and cleans unreferenced bytes after %s', async (_label, failure) => {
    const database = fakeDatabase(failure);
    const store = new MemoryStore();
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      pageSize: 2,
    }).handler;
    await expect(handler(message, new AbortController().signal)).rejects.toThrow();
    expect(store.objects.size).toBe(0);
    expect(store.deleted).toHaveLength(1);
    expect(
      database.calls.some((call) => call.text.includes('state=$2::background_job_state')),
    ).toBe(true);
  });

  it('cleans an interrupted object and leaves the worker error recoverable', async () => {
    const database = fakeDatabase();
    const store = new MemoryStore();
    const controller = new AbortController();
    controller.abort();
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      pageSize: 2,
    }).handler;
    await expect(handler(message, controller.signal)).rejects.toThrow('interrupted');
    expect(store.objects.size).toBe(0);
  });

  it('cleans up and records a streamed object-store write failure', async () => {
    const database = fakeDatabase();
    const store = new MemoryStore();
    store.failWrite = true;
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      pageSize: 2,
    }).handler;
    await expect(handler(message, new AbortController().signal)).rejects.toThrow(
      'write interrupted',
    );
    expect(store.objects.size).toBe(0);
    expect(store.deleted).toHaveLength(1);
  });

  it('does not start a duplicate generation while another worker owns the lease', async () => {
    const database = fakeDatabase({ state: 'running', leaseOwner: 'worker-2' });
    const store = new MemoryStore();
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
    }).handler;
    await expect(handler(message, new AbortController().signal)).rejects.toThrow();
    expect(store.objects.size).toBe(0);
  });

  it('deletes the unreferenced losing artifact when a completed version wins the metadata race', async () => {
    const database = fakeDatabase({ releaseRace: true });
    const store = new MemoryStore();
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      pageSize: 2,
    }).handler;
    await handler(message, new AbortController().signal);
    expect(store.objects.size).toBe(0);
    expect(store.deleted).toHaveLength(1);
  });

  it('treats an already completed delivery as idempotent', async () => {
    const database = fakeDatabase({ state: 'succeeded' });
    const store = new MemoryStore();
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
    }).handler;
    await handler(message, new AbortController().signal);
    expect(store.objects.size).toBe(0);
  });

  it('keeps database pages and object writes bounded for 3.2 million events', async () => {
    const database = fakeDatabase({ eventCount: 3_200_000, pageSize: 10_000 });
    const store = new CountingStore();
    const handler = createDatasetReleaseJobHandler(database.pool, store, logger, {
      workerId: 'worker-1',
      leaseMs: 120000,
      deploymentEnvironment: 'test',
      storageProvider: 'filesystem',
      pageSize: 10_000,
    }).handler;
    await handler(message, new AbortController().signal);
    const insert = database.calls.find((call) =>
      call.text.includes('INSERT INTO dataset_release '),
    );
    expect(insert?.values?.[4]).toBe(3_200_000);
    expect(
      database.calls.filter((call) => call.text.includes('FROM dataset_release_snapshot_event'))
        .length,
    ).toBe(321);
    expect(store.bytes).toBeGreaterThan(50_000_000);
  }, 180_000);
});
