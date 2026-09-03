import { describe, expect, it } from 'vitest';

import { loadWorkerEnvironment } from '../src/config';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://worker:secret@database.example.test:5432/analytics',
  SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE: 'stats-worker.servicebus.windows.net',
  SERVICE_BUS_QUEUE_NAME: 'batch-ingestion',
  AZURE_STORAGE_ACCOUNT_NAME: 'statsstorage',
  AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
};

describe('worker environment', () => {
  it('loads bounded operational defaults without exposing credential values', () => {
    const environment = loadWorkerEnvironment(validEnvironment);

    expect(environment.WORKER_PORT).toBe(3001);
    expect(environment.WORKER_CONCURRENCY).toBe(1);
    expect(environment.WORKER_SHUTDOWN_TIMEOUT_MS).toBe(25_000);
    expect(environment.workerId).toMatch(/-\d+$/);
  });

  it('rejects missing server dependencies and unsafe resource identifiers', () => {
    expect(() =>
      loadWorkerEnvironment({
        ...validEnvironment,
        DATABASE_URL: '',
        AZURE_STORAGE_ACCOUNT_NAME: 'Not-A-Storage-Account',
      }),
    ).toThrow(/DATABASE_URL: Database URL is required/);
  });

  it('bounds concurrency and lock renewal duration', () => {
    expect(() => loadWorkerEnvironment({ ...validEnvironment, WORKER_CONCURRENCY: '100' })).toThrow(
      /WORKER_CONCURRENCY/,
    );
    expect(() =>
      loadWorkerEnvironment({ ...validEnvironment, SERVICE_BUS_LOCK_RENEWAL_MS: '1000' }),
    ).toThrow(/SERVICE_BUS_LOCK_RENEWAL_MS/);
  });

  it('rejects disabled database TLS in production', () => {
    expect(() =>
      loadWorkerEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        DATABASE_SSL_MODE: 'disable',
      }),
    ).toThrow(/Production database connections must use verify-full TLS/);
  });
});
