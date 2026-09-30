import { describe, expect, it } from 'vitest';

import { loadWorkerEnvironment } from '../src/config';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://worker:secret@database.example.test:5432/analytics',
  SERVICE_BUS_FULLY_QUALIFIED_NAMESPACE: 'stats-worker.servicebus.windows.net',
  SERVICE_BUS_QUEUE_NAME: 'batch-ingestion',
  AZURE_STORAGE_ACCOUNT_NAME: 'statsstorage',
  AZURE_STORAGE_CONTAINER_NAME: 'staged-ingestion',
  AZURE_STORAGE_RELEASE_CONTAINER_NAME: 'dataset-releases',
  OBJECT_STORAGE_PROVIDER: 'azure',
  WORKER_TRANSPORT_PROVIDER: 'azure-service-bus',
  DEPLOYMENT_ENVIRONMENT: 'test',
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
        DEPLOYMENT_ENVIRONMENT: 'dev',
        DATABASE_SSL_MODE: 'disable',
      }),
    ).toThrow(/Production database connections must use verify-full TLS/);
  });

  it('refuses local transport and filesystem storage in production', () => {
    expect(() =>
      loadWorkerEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        DATABASE_SSL_MODE: 'verify-full',
        DEPLOYMENT_ENVIRONMENT: 'dev',
        WORKER_TRANSPORT_PROVIDER: 'database',
        OBJECT_STORAGE_PROVIDER: 'filesystem',
        OBJECT_STORAGE_FILESYSTEM_ROOT: '../../.local/object-storage',
      }),
    ).toThrow(/Production worker transport must be azure-service-bus/);
  });

  // The worker's bound is deliberately larger than the API's, because its unit
  // of work is a page of ten thousand rows and no reader is waiting on it.
  it('bounds statement execution time with its own longer default', () => {
    expect(loadWorkerEnvironment(validEnvironment).DATABASE_STATEMENT_TIMEOUT_MS).toBe(60_000);

    expect(
      loadWorkerEnvironment({ ...validEnvironment, DATABASE_STATEMENT_TIMEOUT_MS: '90000' })
        .DATABASE_STATEMENT_TIMEOUT_MS,
    ).toBe(90_000);
  });

  it('rejects a statement bound outside its declared range', () => {
    for (const value of ['0', '999', '120001', '1500.5', 'soon']) {
      expect(() =>
        loadWorkerEnvironment({ ...validEnvironment, DATABASE_STATEMENT_TIMEOUT_MS: value }),
      ).toThrow(/DATABASE_STATEMENT_TIMEOUT_MS/);
    }
  });
});
